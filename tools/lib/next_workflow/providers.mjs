import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, constants as fsConstants, existsSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync, unlinkSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isIP } from "node:net";
import { assertNoSecretMaterial, redactSecretText, validateSecretReferenceShape } from "./secret_policy.mjs";

const IDENTITY_FIELDS = ["execution_provider_id", "model_publisher_id", "agent_product_id", "adapter_id", "transport_id", "model_id"];
const TRANSPORTS = new Set(["cli_process", "api_request", "local_runtime"]);
const CERTIFICATION_STATES = new Set(["CANDIDATE", "CERTIFIED", "EXPIRED", "REVOKED", "FAILED", "DEGRADED", "UNAVAILABLE", "REPROBE_REQUIRED"]);
const INHERITANCE_ORDER = ["agent", "role", "team", "repository", "context", "global"];
const OBSERVATION_TRUST_CLASS = "trusted_runtime_observation";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(input).digest("hex");
}

function hasSecretKey(value) {
  try {
    assertNoSecretMaterial(value, "RAW_SECRET_IN_MANIFEST", { allowedKeyNames: new Set(["secret_reference", "secret_reference_policy"]) });
    return false;
  } catch {
    return true;
  }
}

function requireString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function normalizeAuthorityPath(value) {
  requireString(value, "ACTUAL_WRITABLE_PATH_INVALID");
  if (value.includes("\0") || value.includes("\\")) throw new Error("ACTUAL_WRITABLE_PATH_INVALID");
  const absolute = resolve("/", value);
  return absolute === "/" ? "/" : absolute.replace(/\/$/, "");
}

function authorityPathContains(parent, child) {
  const normalizedParent = normalizeAuthorityPath(parent);
  const normalizedChild = normalizeAuthorityPath(child);
  return normalizedParent === "/" || normalizedParent === normalizedChild || normalizedChild.startsWith(`${normalizedParent}/`);
}

function sortedUniqueStrings(value, code) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) throw new Error(code);
  return [...new Set(value)].sort();
}

function absolutePathWithin(roots, candidate) {
  const normalized = resolve(candidate);
  return roots.some((root) => {
    const rel = relative(resolve(root), normalized);
    return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
  });
}

function validateObservedGrantBoundary(actual, grant) {
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) throw new Error("AGENT_ADMISSION_GRANT_REQUIRED");
  const modeRank = { read_only: 0, workspace_write: 1, danger_full_access: 2 };
  if (!(actual.sandbox?.mode in modeRank) || !(grant.sandbox?.mode in modeRank)) throw new Error("ACTUAL_SANDBOX_MODE_INVALID");
  if (modeRank[actual.sandbox.mode] > modeRank[grant.sandbox.mode]) return "ACTUAL_SANDBOX_EXCEEDS_GRANT";
  if (actual.sandbox.network === true && grant.sandbox.network !== true) return "ACTUAL_NETWORK_EXCEEDS_GRANT";
  const actualWritablePaths = sortedUniqueStrings(actual.sandbox.writable_paths ?? [], "ACTUAL_WRITABLE_PATHS_REQUIRED");
  const grantedWritablePaths = sortedUniqueStrings(grant.sandbox.writable_paths ?? [], "GRANTED_WRITABLE_PATHS_REQUIRED");
  const ownedWritablePaths = sortedUniqueStrings(grant.ownership?.paths ?? [], "GRANTED_OWNERSHIP_PATHS_REQUIRED");
  if (grant.ownership?.read_only === true && (actual.sandbox.mode !== "read_only" || actualWritablePaths.length > 0)) return "ACTUAL_WRITABLE_PATHS_EXCEED_OWNERSHIP";
  if (actual.sandbox.mode === "read_only" && actualWritablePaths.length > 0) return "ACTUAL_WRITABLE_PATHS_EXCEED_GRANT";
  if (actualWritablePaths.some((candidate) => !grantedWritablePaths.some((allowed) => authorityPathContains(allowed, candidate)))) return "ACTUAL_WRITABLE_PATHS_EXCEED_GRANT";
  if (actualWritablePaths.some((candidate) => !ownedWritablePaths.some((owned) => authorityPathContains(owned, candidate)))) return "ACTUAL_WRITABLE_PATHS_EXCEED_OWNERSHIP";
  for (const [actualField, grantField, code] of [
    ["capabilities", "capabilities", "ACTUAL_CAPABILITIES_EXCEED_GRANT"],
    ["actions", "allowed_actions", "ACTUAL_ACTIONS_EXCEED_GRANT"],
    ["tools", "allowed_tools", "ACTUAL_TOOLS_EXCEED_GRANT"]
  ]) {
    const observed = sortedUniqueStrings(actual[actualField], `ACTUAL_${actualField.toUpperCase()}_REQUIRED`);
    const allowed = new Set(sortedUniqueStrings(grant[grantField], `GRANTED_${grantField.toUpperCase()}_REQUIRED`));
    if (observed.some((item) => !allowed.has(item))) return code;
  }
  if (!actual.resource_limits || typeof actual.resource_limits !== "object" || Array.isArray(actual.resource_limits)) throw new Error("ACTUAL_RESOURCE_LIMITS_REQUIRED");
  for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) {
    const observed = actual.resource_limits[field];
    const allowed = grant.budget?.[field];
    if (!Number.isFinite(observed) || observed < 0 || !Number.isFinite(allowed) || allowed < 0) throw new Error(`ACTUAL_RESOURCE_LIMIT_INVALID:${field}`);
    if (observed > allowed) return `ACTUAL_RESOURCE_LIMIT_EXCEEDS_GRANT:${field}`;
  }
  return null;
}

function validateSchemaValue(value, schema, path = "$") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) throw new Error(`JSON_SCHEMA_INVALID:${path}`);
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => canonicalJson(candidate) === canonicalJson(value))) throw new Error(`JSON_SCHEMA_ENUM_MISMATCH:${path}`);
  const type = schema.type;
  const matchesType = type === undefined
    || (type === "object" && value !== null && typeof value === "object" && !Array.isArray(value))
    || (type === "array" && Array.isArray(value))
    || (type === "string" && typeof value === "string")
    || (type === "number" && Number.isFinite(value))
    || (type === "integer" && Number.isSafeInteger(value))
    || (type === "boolean" && typeof value === "boolean")
    || (type === "null" && value === null);
  if (!matchesType) throw new Error(`JSON_SCHEMA_TYPE_MISMATCH:${path}`);
  if (type === "object") {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) if (!Object.hasOwn(value, required)) throw new Error(`JSON_SCHEMA_REQUIRED_FIELD:${path}.${required}`);
    if (Number.isSafeInteger(schema.maxProperties) && Object.keys(value).length > schema.maxProperties) throw new Error(`JSON_SCHEMA_MAX_PROPERTIES:${path}`);
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validateSchemaValue(child, properties[key], `${path}.${key}`);
      else if (schema.additionalProperties === false) throw new Error(`JSON_SCHEMA_ADDITIONAL_PROPERTY:${path}.${key}`);
    }
  }
  if (type === "array") {
    if (Number.isSafeInteger(schema.maxItems) && value.length > schema.maxItems) throw new Error(`JSON_SCHEMA_MAX_ITEMS:${path}`);
    if (schema.items) value.forEach((item, index) => validateSchemaValue(item, schema.items, `${path}[${index}]`));
  }
  if (type === "string" && Number.isSafeInteger(schema.maxLength) && value.length > schema.maxLength) throw new Error(`JSON_SCHEMA_MAX_LENGTH:${path}`);
  return true;
}

export function providerIdentity(input) {
  if (!input || typeof input !== "object") throw new Error("PROVIDER_IDENTITY_REQUIRED");
  const identity = {};
  for (const field of IDENTITY_FIELDS) {
    if (field === "agent_product_id" && input[field] === null) identity[field] = null;
    else identity[field] = requireString(input[field], `PROVIDER_IDENTITY_FIELD_REQUIRED:${field}`);
  }
  if (!TRANSPORTS.has(identity.transport_id)) throw new Error("PROVIDER_TRANSPORT_INVALID");
  return identity;
}

export function providerIdentityKey(identity) {
  return IDENTITY_FIELDS.map((field) => providerIdentity(identity)[field] ?? "-").join(":");
}

function normalizeManifest(manifest) {
  const identity = providerIdentity(manifest.identity);
  if (!Array.isArray(manifest.capabilities)) throw new Error("PROVIDER_CAPABILITIES_REQUIRED");
  if (!Array.isArray(manifest.native_reasoning_values)) throw new Error("PROVIDER_REASONING_VALUES_REQUIRED");
  if (!manifest.effort_mapping || typeof manifest.effort_mapping !== "object") throw new Error("PROVIDER_EFFORT_MAPPING_REQUIRED");
  const certificationProfile = manifest.certification_profile;
  if (!certificationProfile || certificationProfile.probe_authority !== "independent" || certificationProfile.certification_authority !== "independent" || certificationProfile.isolated_probe !== true) throw new Error("PROVIDER_CERTIFICATION_PROFILE_INVALID");
  return {
    manifest_id: requireString(manifest.manifest_id, "PROVIDER_MANIFEST_ID_REQUIRED"),
    version: requireString(manifest.version, "PROVIDER_MANIFEST_VERSION_REQUIRED"),
    identity,
    identity_key: providerIdentityKey(identity),
    capabilities: [...new Set(manifest.capabilities)].sort(),
    native_reasoning_values: [...new Set(manifest.native_reasoning_values)].sort(),
    effort_mapping: { ...manifest.effort_mapping },
    certification_profile: structuredClone(certificationProfile),
    resource_bounds: { ...(manifest.resource_bounds ?? {}) },
    transport_descriptor: structuredClone(manifest.transport_descriptor ?? {}),
    reasoning_mapping_provenance: structuredClone(manifest.reasoning_mapping_provenance ?? null),
    custom: manifest.custom === true,
    requires_observation: manifest.custom === true || manifest.requires_observation === true,
    priority: manifest.priority ?? 100,
    estimated_cost: manifest.estimated_cost ?? 0
  };
}

function normalizeCertification(certification) {
  const state = certification.state;
  if (!CERTIFICATION_STATES.has(state)) throw new Error("CERTIFICATION_STATE_INVALID");
  const certifiedAt = requireString(certification.certified_at, "CERTIFICATION_TIME_REQUIRED");
  const expiresAt = requireString(certification.expires_at, "CERTIFICATION_EXPIRY_REQUIRED");
  const revocationEpoch = Number(certification.revocation_epoch ?? 0);
  if (!Number.isFinite(Date.parse(certifiedAt)) || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(certifiedAt) >= Date.parse(expiresAt)) throw new Error("CERTIFICATION_TIME_INVALID");
  if (!Number.isSafeInteger(revocationEpoch) || revocationEpoch < 0) throw new Error("CERTIFICATION_REVOCATION_EPOCH_INVALID");
  for (const [field, code] of [["capability_fingerprint", "CERTIFICATION_CAPABILITY_FINGERPRINT_INVALID"], ["observation_fingerprint", "CERTIFICATION_OBSERVATION_FINGERPRINT_INVALID"], ["probe_fingerprint", "CERTIFICATION_PROBE_FINGERPRINT_INVALID"], ["clock_fingerprint", "CERTIFICATION_CLOCK_FINGERPRINT_INVALID"], ["authority_fingerprint", "CERTIFICATION_AUTHORITY_FINGERPRINT_INVALID"], ["drift_fingerprint", "CERTIFICATION_DRIFT_FINGERPRINT_INVALID"]]) {
    if (!/^[a-f0-9]{64}$/.test(requireString(certification[field], code))) throw new Error(code);
  }
  if (certification.revocation_state !== "active" && certification.revocation_state !== "revoked") throw new Error("CERTIFICATION_REVOCATION_STATE_INVALID");
  if (certification.state === "REVOKED" && certification.revocation_state !== "revoked") throw new Error("CERTIFICATION_REVOCATION_STATE_MISMATCH");
  if (certification.state !== "REVOKED" && certification.revocation_state !== "active") throw new Error("CERTIFICATION_REVOCATION_STATE_MISMATCH");
  if (certification.clock_fingerprint !== digest({ certified_at: certifiedAt, expires_at: expiresAt })) throw new Error("CERTIFICATION_CLOCK_EVIDENCE_MISMATCH");
  const normalized = {
    certification_id: requireString(certification.certification_id, "CERTIFICATION_ID_REQUIRED"),
    certifier_id: requireString(certification.certifier_id, "CERTIFICATION_CERTIFIER_REQUIRED"),
    identity_key: requireString(certification.identity_key, "CERTIFICATION_IDENTITY_REQUIRED"),
    manifest_version: requireString(certification.manifest_version, "CERTIFICATION_MANIFEST_VERSION_REQUIRED"),
    adapter_version: requireString(certification.adapter_version, "CERTIFICATION_ADAPTER_VERSION_REQUIRED"),
    platform: requireString(certification.platform, "CERTIFICATION_PLATFORM_REQUIRED"),
    capability_fingerprint: requireString(certification.capability_fingerprint, "CERTIFICATION_CAPABILITY_FINGERPRINT_REQUIRED"),
    state,
    certified_at: certifiedAt,
    expires_at: expiresAt,
    revocation_epoch: revocationEpoch,
    revocation_state: certification.revocation_state,
    observation_fingerprint: requireString(certification.observation_fingerprint, "CERTIFICATION_OBSERVATION_REQUIRED"),
    probe_lineage: requireString(certification.probe_lineage, "CERTIFICATION_PROBE_LINEAGE_REQUIRED"),
    probe_authority_id: requireString(certification.probe_authority_id, "CERTIFICATION_PROBE_AUTHORITY_REQUIRED"),
    probe_fingerprint: certification.probe_fingerprint,
    certification_proof_fingerprint: requireString(certification.certification_proof_fingerprint, "CERTIFICATION_PROOF_REQUIRED"),
    clock_fingerprint: certification.clock_fingerprint,
    authority_fingerprint: certification.authority_fingerprint,
    drift_fingerprint: certification.drift_fingerprint
  };
  if (normalized.probe_authority_id === normalized.certifier_id) throw new Error("CERTIFICATION_AUTHORITIES_NOT_INDEPENDENT");
  if (!/^[a-f0-9]{64}$/.test(normalized.certification_proof_fingerprint)) throw new Error("CERTIFICATION_PROOF_INVALID");
  if (normalized.authority_fingerprint !== digest({ certifier_id: normalized.certifier_id, probe_authority_id: normalized.probe_authority_id, certification_proof_fingerprint: normalized.certification_proof_fingerprint })) throw new Error("CERTIFICATION_AUTHORITY_EVIDENCE_MISMATCH");
  const expectedDrift = digest({ identity_key: normalized.identity_key, manifest_version: normalized.manifest_version, adapter_version: normalized.adapter_version, platform: normalized.platform, capability_fingerprint: normalized.capability_fingerprint, observation_fingerprint: normalized.observation_fingerprint, revocation_epoch: normalized.revocation_epoch });
  if (normalized.drift_fingerprint !== expectedDrift) throw new Error("CERTIFICATION_DRIFT_EVIDENCE_MISMATCH");
  return normalized;
}

export function validateCustomManifest(manifest, { executableObservation, endpointObservation } = {}) {
  const normalized = normalizeManifest(manifest);
  if (hasSecretKey(manifest)) throw new Error("RAW_SECRET_IN_MANIFEST");
  const descriptor = normalized.transport_descriptor;
  if (normalized.identity.transport_id === "cli_process") {
    if (!Array.isArray(descriptor.argv_schema) || descriptor.argv_schema.some((item) => typeof item !== "string")) throw new Error("CLI_ARGV_SCHEMA_INVALID");
    validateArgvTemplate(descriptor.argv_template, descriptor.argv_schema);
    if (typeof descriptor.shell_template === "string") throw new Error("SHELL_TEMPLATE_FORBIDDEN");
    validateExecutableDescriptor(descriptor.executable, executableObservation);
    if (descriptor.interpreter !== null && descriptor.interpreter !== undefined) validateExecutableDescriptor(descriptor.interpreter, executableObservation?.interpreter_observation);
    if (descriptor.private_response_file !== true) throw new Error("PRIVATE_RESPONSE_FILE_REQUIRED");
    if (!Array.isArray(descriptor.environment_allowlist) || descriptor.environment_allowlist.some((name) => !/^[A-Z][A-Z0-9_]*$/.test(name))) throw new Error("CLI_ENVIRONMENT_ALLOWLIST_INVALID");
    if (normalized.custom) {
      const policy = descriptor.execution_policy;
      if (!policy || !Array.isArray(policy.allowed_owner_uids) || policy.allowed_owner_uids.length === 0 || policy.allowed_owner_uids.some((uid) => !Number.isSafeInteger(uid) || uid < 0) || !Number.isSafeInteger(policy.executable_mode_mask) || policy.executable_mode_mask < 0 || policy.executable_mode_mask > 0o777 || !Array.isArray(policy.allowed_working_roots) || policy.allowed_working_roots.length === 0 || policy.allowed_working_roots.some((root) => !isAbsolute(root)) || !Array.isArray(policy.allowed_response_roots) || policy.allowed_response_roots.length === 0 || policy.allowed_response_roots.some((root) => !isAbsolute(root))) throw new Error("CLI_EXECUTION_POLICY_INVALID");
      for (const field of ["timeout_ms", "max_prompt_bytes", "max_response_bytes", "max_stderr_bytes"]) if (!Number.isSafeInteger(policy[field]) || policy[field] <= 0) throw new Error(`CLI_EXECUTION_BOUND_INVALID:${field}`);
    }
  } else if (normalized.identity.transport_id === "api_request") {
    if (descriptor.endpoint?.connection_path_policy !== "observed") throw new Error("ENDPOINT_CONNECTION_PATH_POLICY_REQUIRED");
    validateEndpointObservation(descriptor.endpoint, endpointObservation);
    const secretPolicy = descriptor.secret_reference_policy;
    const policyLists = ["allowed_namespaces", "allowed_resolvers", "allowed_audiences", "allowed_adapter_ids", "allowed_scopes", "allowed_delivery_modes"];
    if (!secretPolicy || policyLists.some((field) => !Array.isArray(secretPolicy[field]) || secretPolicy[field].length === 0 || secretPolicy[field].some((value) => typeof value !== "string" || value.length === 0)) || !Number.isSafeInteger(secretPolicy.minimum_rotation_epoch) || secretPolicy.minimum_rotation_epoch < 0 || !Number.isSafeInteger(secretPolicy.current_revocation_epoch) || secretPolicy.current_revocation_epoch < 0) throw new Error("SECRET_REFERENCE_POLICY_INVALID");
    validateSecretReference(descriptor.secret_reference, secretReferencePolicyOptions(secretPolicy));
    if (!Array.isArray(descriptor.methods) || descriptor.methods.length === 0 || descriptor.methods.some((method) => !new Set(["GET", "POST"]).has(method))) throw new Error("API_METHOD_INVALID");
    if (!descriptor.request_schema || typeof descriptor.request_schema !== "object" || Array.isArray(descriptor.request_schema)) throw new Error("API_REQUEST_SCHEMA_REQUIRED");
    if (!descriptor.response_schema || typeof descriptor.response_schema !== "object" || Array.isArray(descriptor.response_schema)) throw new Error("API_RESPONSE_SCHEMA_REQUIRED");
    const requestPolicy = descriptor.request_policy;
    if (!requestPolicy || !Number.isSafeInteger(requestPolicy.timeout_ms) || requestPolicy.timeout_ms <= 0 || !Number.isSafeInteger(requestPolicy.max_attempts) || requestPolicy.max_attempts < 1 || requestPolicy.max_attempts > 3 || !Number.isSafeInteger(requestPolicy.max_request_bytes) || requestPolicy.max_request_bytes <= 0 || !Number.isSafeInteger(requestPolicy.max_response_bytes) || requestPolicy.max_response_bytes <= 0 || !Number.isSafeInteger(requestPolicy.redirect_limit) || requestPolicy.redirect_limit < 0 || requestPolicy.redirect_limit > 5 || !Array.isArray(requestPolicy.retry_methods) || requestPolicy.retry_methods.some((method) => !descriptor.methods.includes(method)) || (requestPolicy.retry_methods.includes("POST") && typeof requestPolicy.idempotency_header !== "string")) throw new Error("API_REQUEST_POLICY_INVALID");
    if (descriptor.response_attestation_required !== true) throw new Error("API_RESPONSE_ATTESTATION_REQUIRED");
  } else {
    if (descriptor.endpoint?.connection_path_policy !== "observed") throw new Error("ENDPOINT_CONNECTION_PATH_POLICY_REQUIRED");
    validateEndpointObservation(descriptor.endpoint, endpointObservation, { localRuntime: true });
    if (descriptor.start_stop_authority !== "explicit") throw new Error("LOCAL_RUNTIME_START_STOP_AUTHORITY_REQUIRED");
    if (descriptor.implicit_download === true || descriptor.implicit_install === true) throw new Error("IMPLICIT_RUNTIME_EFFECT_FORBIDDEN");
  }
  return {
    valid: true,
    manifest: normalized,
    requires_observation: executableObservation === undefined && endpointObservation === undefined,
  };
}

export function validateExecutableDescriptor(descriptor, observation) {
  if (!descriptor || typeof descriptor !== "object") throw new Error("EXECUTABLE_DESCRIPTOR_REQUIRED");
  if (!isAbsolute(descriptor.canonical_path)) throw new Error("EXECUTABLE_PATH_NOT_ABSOLUTE");
  requireString(descriptor.digest, "EXECUTABLE_DIGEST_REQUIRED");
  if (!observation) return { requires_observation: true };
  const actualPath = realpathSync(observation.path ?? descriptor.canonical_path);
  const stats = lstatSync(actualPath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("EXECUTABLE_IDENTITY_INVALID");
  if (actualPath !== resolve(descriptor.canonical_path)) throw new Error("EXECUTABLE_PATH_MISMATCH");
  if (digest(readFileSync(actualPath)) !== descriptor.digest) throw new Error("EXECUTABLE_DIGEST_MISMATCH");
  if (observation.owner_uid !== undefined && stats.uid !== observation.owner_uid) throw new Error("EXECUTABLE_OWNER_MISMATCH");
  return { path: actualPath, device: stats.dev, inode: stats.ino, uid: stats.uid, mode: stats.mode & 0o777, digest: descriptor.digest };
}

function ipClass(address) {
  const mappedDotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedDotted && isIP(mappedDotted[1]) === 4) return ipClass(mappedDotted[1]);
  const mappedHex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return ipClass(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  if (address === "::") return "unspecified";
  if (address === "::1" || address.startsWith("127.")) return "loopback";
  if (address === "169.254.169.254" || address === "fd00:ec2::254") return "metadata";
  if (address.startsWith("169.254.") || /^fe[89ab]/i.test(address)) return "link_local";
  if (address.startsWith("10.") || address.startsWith("192.168.")) return "private";
  const match = address.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return "private";
  if (/^(fc|fd)/i.test(address)) return "private";
  if (/^ff/i.test(address)) return "multicast";
  if (/^2001:db8(?::|$)/i.test(address)) return "reserved";
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    if (octets[0] === 0) return "unspecified";
    if (octets[0] >= 224 && octets[0] <= 239) return "multicast";
    if (octets[0] >= 240 || (octets[0] === 255 && octets.every((octet) => octet === 255))) return "reserved";
    if ((octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
      || (octets[0] === 192 && octets[1] === 0 && (octets[2] === 0 || octets[2] === 2))
      || (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19 || octets[1] === 51 && octets[2] === 100))
      || (octets[0] === 203 && octets[1] === 0 && octets[2] === 113)) return "reserved";
  }
  return "public";
}

export function validateEndpointObservation(endpoint, observation, { localRuntime = false } = {}) {
  if (!endpoint || typeof endpoint !== "object") throw new Error("ENDPOINT_POLICY_REQUIRED");
  const url = new URL(endpoint.url);
  const allowedSchemes = localRuntime ? new Set(["http:", "https:", "unix:"]) : new Set(["https:"]);
  if (!allowedSchemes.has(url.protocol)) throw new Error("ENDPOINT_SCHEME_FORBIDDEN");
  if (url.username || url.password) throw new Error("ENDPOINT_USERINFO_FORBIDDEN");
  if (url.protocol === "https:") requireString(endpoint.certificate_policy, "ENDPOINT_CERTIFICATE_POLICY_REQUIRED");
  let exactLocalDestination = null;
  if (localRuntime) {
    exactLocalDestination = endpoint.exact_destination;
    if (!exactLocalDestination || typeof exactLocalDestination !== "object" || Array.isArray(exactLocalDestination) || typeof exactLocalDestination.service_id !== "string" || exactLocalDestination.service_id.length === 0) throw new Error("LOCAL_RUNTIME_EXACT_DESTINATION_REQUIRED");
    if (url.protocol === "unix:") {
      if (typeof exactLocalDestination.socket_path !== "string" || exactLocalDestination.socket_path !== decodeURIComponent(url.pathname) || !Number.isSafeInteger(exactLocalDestination.owner_uid) || exactLocalDestination.owner_uid < 0) throw new Error("LOCAL_RUNTIME_EXACT_SOCKET_POLICY_INVALID");
    } else if (exactLocalDestination.origin !== url.origin || !Array.isArray(exactLocalDestination.addresses) || exactLocalDestination.addresses.length === 0 || exactLocalDestination.addresses.some((address) => isIP(address) === 0)) throw new Error("LOCAL_RUNTIME_EXACT_NETWORK_POLICY_INVALID");
  }
  const configuredUrl = url.href;
  const allowedRedirectOrigins = new Set([url.origin]);
  for (const entry of endpoint.allowed_redirect_origins ?? []) {
    const allowed = new URL(entry);
    if (!allowedSchemes.has(allowed.protocol) || allowed.username || allowed.password || allowed.pathname !== "/" || allowed.search || allowed.hash) throw new Error("ENDPOINT_REDIRECT_ALLOWLIST_INVALID");
    allowedRedirectOrigins.add(allowed.origin);
  }
  if (!observation) return { requires_observation: true, configured_url: configuredUrl };
  if (localRuntime && observation.service_id !== exactLocalDestination.service_id) throw new Error("LOCAL_RUNTIME_SERVICE_IDENTITY_MISMATCH");
  if (endpoint.connection_path_policy === "observed") {
    if (!Array.isArray(observation.connection_path) || observation.connection_path.length === 0) throw new Error("ENDPOINT_CONNECTION_PATH_REQUIRED");
    const allowedConnectionKinds = new Set(["direct", "proxy", "tunnel"]);
    const allowedIntermediaries = new Set((endpoint.allowed_intermediary_origins ?? []).map((entry) => new URL(entry).origin));
    let priorDestination = null;
    for (const [index, leg] of observation.connection_path.entries()) {
      if (!leg || typeof leg !== "object" || !allowedConnectionKinds.has(leg.kind) || typeof leg.destination_origin !== "string") throw new Error("ENDPOINT_CONNECTION_PATH_INVALID");
      const destination = new URL(leg.destination_origin);
      if (!allowedSchemes.has(destination.protocol) || destination.username || destination.password || destination.pathname !== "/" || destination.search || destination.hash) throw new Error("ENDPOINT_CONNECTION_PATH_INVALID");
      if (index > 0 && leg.source_origin !== priorDestination) throw new Error("ENDPOINT_CONNECTION_PATH_CONTINUITY_MISMATCH");
      if (index < observation.connection_path.length - 1 && !allowedIntermediaries.has(destination.origin)) throw new Error("ENDPOINT_INTERMEDIARY_NOT_ALLOWLISTED");
      if (url.protocol === "unix:" && leg.socket_path !== exactLocalDestination.socket_path) throw new Error("LOCAL_RUNTIME_SOCKET_PATH_MISMATCH");
      if (url.protocol !== "unix:" && (!Array.isArray(leg.addresses) || leg.addresses.length === 0)) throw new Error("ENDPOINT_CONNECTION_PATH_ADDRESSES_REQUIRED");
      if (url.protocol === "unix:") continue;
      for (const address of leg.addresses) {
        if (isIP(address) === 0) throw new Error("ENDPOINT_CONNECTION_PATH_ADDRESS_INVALID");
        const classification = ipClass(address);
        if (localRuntime ? !exactLocalDestination.addresses.includes(address) : classification !== "public") throw new Error(`ENDPOINT_CONNECTION_PATH_DESTINATION_FORBIDDEN:${classification}`);
      }
      if (destination.protocol === "https:" && (leg.tls_peer_verified !== true || String(leg.sni).toLowerCase() !== destination.hostname.toLowerCase() || leg.certificate_policy !== endpoint.certificate_policy)) throw new Error("ENDPOINT_CONNECTION_PATH_TLS_MISMATCH");
      if (index === observation.connection_path.length - 1 && destination.origin !== url.origin) throw new Error("ENDPOINT_CONNECTION_PATH_DESTINATION_MISMATCH");
      priorDestination = destination.origin;
    }
  }
  if (!Array.isArray(observation.hops) || observation.hops.length === 0) throw new Error("ENDPOINT_HOPS_REQUIRED");
  const normalizedHops = [];
  for (let index = 0; index < observation.hops.length; index += 1) {
    const hop = observation.hops[index];
    const hopUrl = new URL(hop.url);
    if (!allowedSchemes.has(hopUrl.protocol)) throw new Error("ENDPOINT_REDIRECT_SCHEME_FORBIDDEN");
    if (hopUrl.username || hopUrl.password) throw new Error("ENDPOINT_USERINFO_FORBIDDEN");
    if (index === 0 && hopUrl.href !== configuredUrl) throw new Error("ENDPOINT_INITIAL_URL_MISMATCH");
    if (index > 0) {
      if (!allowedRedirectOrigins.has(hopUrl.origin)) throw new Error("ENDPOINT_REDIRECT_NOT_ALLOWLISTED");
      const previous = observation.hops[index - 1];
      const declaredTarget = previous.redirect_to ?? previous.redirect_location ?? previous.location;
      const declaredSource = hop.redirected_from;
      if (declaredTarget === undefined && declaredSource === undefined) throw new Error("ENDPOINT_REDIRECT_CONTINUITY_REQUIRED");
      if (declaredTarget !== undefined && new URL(declaredTarget, previous.url).href !== hopUrl.href) throw new Error("ENDPOINT_REDIRECT_CONTINUITY_MISMATCH");
      if (declaredSource !== undefined && new URL(declaredSource).href !== new URL(previous.url).href) throw new Error("ENDPOINT_REDIRECT_CONTINUITY_MISMATCH");
    }
    if (url.protocol === "unix:" && hop.socket_path !== exactLocalDestination.socket_path) throw new Error("LOCAL_RUNTIME_SOCKET_PATH_MISMATCH");
    if (url.protocol !== "unix:" && (!Array.isArray(hop.addresses) || hop.addresses.length === 0)) throw new Error("ENDPOINT_ADDRESSES_REQUIRED");
    const addresses = [];
    for (const address of hop.addresses ?? []) {
      if (isIP(address) === 0) throw new Error("ENDPOINT_ADDRESS_INVALID");
      const classification = ipClass(address);
      if (localRuntime ? !exactLocalDestination.addresses.includes(address) : classification !== "public") throw new Error(`ENDPOINT_DESTINATION_FORBIDDEN:${classification}`);
      addresses.push(address);
    }
    if (hopUrl.protocol === "https:" && (hop.tls_peer_verified !== true || String(hop.sni).toLowerCase() !== hopUrl.hostname.toLowerCase() || hop.certificate_policy !== endpoint.certificate_policy)) throw new Error("TLS_PEER_POLICY_MISMATCH");
    normalizedHops.push({
      url: hopUrl.href,
      addresses: [...new Set(addresses)].sort(),
      tls_peer_verified: hopUrl.protocol === "https:" ? true : null,
      sni: hopUrl.protocol === "https:" ? hopUrl.hostname : null,
      certificate_policy: hopUrl.protocol === "https:" ? endpoint.certificate_policy : null,
    });
  }
  const lastHop = observation.hops.at(-1);
  if (lastHop.redirect_to !== undefined || lastHop.redirect_location !== undefined || lastHop.location !== undefined) throw new Error("ENDPOINT_REDIRECT_CHAIN_INCOMPLETE");
  if (observation.final_url !== undefined && new URL(observation.final_url).href !== normalizedHops.at(-1).url) throw new Error("ENDPOINT_FINAL_URL_MISMATCH");
  return { valid: true, configured_url: configuredUrl, connection_path: structuredClone(observation.connection_path ?? [{ kind: "direct", destination_origin: url.origin }]), hops: normalizedHops, observed_hops: normalizedHops.length };
}

function secretReferencePolicyOptions(policy) {
  return {
    allowedNamespaces: policy.allowed_namespaces,
    allowedResolvers: policy.allowed_resolvers,
    allowedAudiences: policy.allowed_audiences,
    allowedAdapterIds: policy.allowed_adapter_ids,
    allowedScopes: policy.allowed_scopes,
    allowedDeliveryModes: policy.allowed_delivery_modes,
    minimumRotationEpoch: policy.minimum_rotation_epoch,
    currentRevocationEpoch: policy.current_revocation_epoch,
  };
}

export function validateSecretReference(reference, { now = new Date().toISOString(), allowedNamespaces, allowedResolvers, allowedAudiences, allowedAdapterIds, allowedScopes, allowedDeliveryModes, minimumRotationEpoch = 0, currentRevocationEpoch = 0 } = {}) {
  validateSecretReferenceShape(reference);
  for (const field of ["reference_id", "namespace", "resolver", "audience", "adapter_id", "scope", "issued_at", "expires_at", "revocation_state", "delivery_mode"]) requireString(reference[field], `SECRET_REFERENCE_FIELD_REQUIRED:${field}`);
  for (const field of ["rotation_epoch", "revocation_epoch"]) if (!Number.isSafeInteger(reference[field]) || reference[field] < 0) throw new Error(`SECRET_REFERENCE_FIELD_INVALID:${field}`);
  if (reference.revocation_state !== "active") throw new Error("SECRET_REFERENCE_REVOKED");
  if (!Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(reference.issued_at)) || !Number.isFinite(Date.parse(reference.expires_at)) || Date.parse(reference.issued_at) >= Date.parse(reference.expires_at) || Date.parse(reference.issued_at) > Date.parse(now)) throw new Error("SECRET_REFERENCE_EXPIRY_INVALID");
  if (Date.parse(reference.expires_at) <= Date.parse(now)) throw new Error("SECRET_REFERENCE_EXPIRED");
  for (const [values, field, code] of [[allowedNamespaces, "namespace", "SECRET_REFERENCE_NAMESPACE_FORBIDDEN"], [allowedResolvers, "resolver", "SECRET_REFERENCE_RESOLVER_FORBIDDEN"], [allowedAudiences, "audience", "SECRET_REFERENCE_AUDIENCE_FORBIDDEN"], [allowedAdapterIds, "adapter_id", "SECRET_REFERENCE_ADAPTER_FORBIDDEN"], [allowedScopes, "scope", "SECRET_REFERENCE_SCOPE_FORBIDDEN"], [allowedDeliveryModes, "delivery_mode", "SECRET_REFERENCE_DELIVERY_FORBIDDEN"]]) {
    if (values !== undefined && (!Array.isArray(values) || !values.includes(reference[field]))) throw new Error(code);
  }
  if (reference.rotation_epoch < minimumRotationEpoch) throw new Error("SECRET_REFERENCE_ROTATION_STALE");
  if (reference.revocation_epoch !== currentRevocationEpoch) throw new Error("SECRET_REFERENCE_REVOCATION_EPOCH_MISMATCH");
  return { valid: true, fingerprint: digest(reference) };
}

export function transitionProviderCertification({ certification, toState, freshProbeLineage = null }) {
  if (!certification || !CERTIFICATION_STATES.has(certification.state) || !CERTIFICATION_STATES.has(toState)) throw new Error("CERTIFICATION_TRANSITION_INPUT_INVALID");
  if (certification.state === "REVOKED") throw new Error("CERTIFICATION_REVOKED_TERMINAL");
  const recoveryStates = new Set(["EXPIRED", "FAILED", "DEGRADED", "UNAVAILABLE", "REPROBE_REQUIRED"]);
  const allowed = certification.state === "CANDIDATE"
    ? new Set(["CERTIFIED", "FAILED", "REVOKED"])
    : certification.state === "CERTIFIED"
      ? new Set(["EXPIRED", "REVOKED", "DEGRADED", "UNAVAILABLE", "REPROBE_REQUIRED"])
      : recoveryStates.has(certification.state)
        ? new Set(["CANDIDATE", "REVOKED"])
        : new Set();
  if (!allowed.has(toState)) throw new Error("CERTIFICATION_TRANSITION_FORBIDDEN");
  if (recoveryStates.has(certification.state) && toState === "CANDIDATE" && (typeof freshProbeLineage !== "string" || freshProbeLineage.length === 0 || freshProbeLineage === certification.probe_lineage)) throw new Error("CERTIFICATION_FRESH_PROBE_LINEAGE_REQUIRED");
  return { ...structuredClone(certification), state: toState, probe_lineage: toState === "CANDIDATE" ? freshProbeLineage : certification.probe_lineage ?? null };
}

function observationFor(manifest, observations) {
  if (observations instanceof Map) return observations.get(manifest.identity_key) ?? observations.get(manifest.manifest_id);
  if (Array.isArray(observations)) return observations.find((item) => item?.identity_key === manifest.identity_key || item?.manifest_id === manifest.manifest_id);
  if (observations && typeof observations === "object") return observations[manifest.identity_key] ?? observations[manifest.manifest_id];
  return undefined;
}

function validateFreshCustomObservation({ manifest, observation, verifier, now }) {
  if (!observation || typeof observation !== "object") throw new Error("PROVIDER_OBSERVATION_REQUIRED");
  if (observation.trust_class !== OBSERVATION_TRUST_CLASS) throw new Error("PROVIDER_OBSERVATION_UNTRUSTED");
  if (observation.identity_key !== manifest.identity_key || observation.manifest_version !== manifest.version) throw new Error("PROVIDER_OBSERVATION_IDENTITY_MISMATCH");
  for (const field of ["observed_at", "fresh_until", "observer_id"]) requireString(observation[field], `PROVIDER_OBSERVATION_FIELD_REQUIRED:${field}`);
  if (Number.isNaN(Date.parse(observation.observed_at)) || Number.isNaN(Date.parse(observation.fresh_until)) || Date.parse(observation.observed_at) > Date.parse(now) || Date.parse(observation.fresh_until) < Date.parse(now)) throw new Error("PROVIDER_OBSERVATION_STALE");
  let evidence;
  if (manifest.identity.transport_id === "cli_process") {
    evidence = {
      executable: validateExecutableDescriptor(manifest.transport_descriptor.executable, observation.executable_observation),
      ...(manifest.transport_descriptor.interpreter ? { interpreter: validateExecutableDescriptor(manifest.transport_descriptor.interpreter, observation.interpreter_observation) } : {}),
    };
  } else {
    evidence = {
      endpoint: validateEndpointObservation(manifest.transport_descriptor.endpoint, observation.endpoint_observation, { localRuntime: manifest.identity.transport_id === "local_runtime" }),
    };
  }
  const observed = {
    identity_key: manifest.identity_key,
    manifest_version: manifest.version,
    observer_id: observation.observer_id,
    observed_at: observation.observed_at,
    fresh_until: observation.fresh_until,
    evidence,
  };
  const observationFingerprint = digest(observed);
  if (!verifier || verifier.trusted !== true || typeof verifier.verify !== "function") throw new Error("PROVIDER_OBSERVATION_VERIFIER_REQUIRED");
  const verdict = verifier.verify({ manifest: structuredClone(manifest), observation: structuredClone(observation), normalized_observation: structuredClone(observed), fingerprint: observationFingerprint, now });
  if (verdict && typeof verdict.then === "function") throw new Error("PROVIDER_OBSERVATION_VERIFIER_ASYNC_UNSUPPORTED");
  if (verdict?.verified !== true || verdict.fingerprint !== observationFingerprint || verdict.observer_id !== observation.observer_id || verdict.identity_key !== manifest.identity_key) throw new Error("PROVIDER_OBSERVATION_VERIFICATION_FAILED");
  return { ...observed, fingerprint: observationFingerprint };
}

export function loadProviderRegistry({ manifests, certifications, observations = [], observationVerifier, certificationVerifier, clock = () => new Date().toISOString(), platform }) {
  if (!Array.isArray(manifests) || !Array.isArray(certifications)) throw new Error("PROVIDER_REGISTRY_INPUT_REQUIRED");
  const manifestMap = new Map();
  for (const input of manifests) {
    const normalized = validateCustomManifest(input).manifest;
    if (manifestMap.has(normalized.identity_key)) throw new Error(`PROVIDER_IDENTITY_DUPLICATE:${normalized.identity_key}`);
    manifestMap.set(normalized.identity_key, normalized);
  }
  const certificationMap = new Map();
  for (const input of certifications) {
    const certification = normalizeCertification(input);
    if (certificationMap.has(certification.identity_key)) throw new Error(`CERTIFICATION_DUPLICATE:${certification.identity_key}`);
    certificationMap.set(certification.identity_key, certification);
  }
  const now = clock();
  const entries = [...manifestMap.values()].map((manifest) => {
    const certification = certificationMap.get(manifest.identity_key);
    const reasons = [];
    let observation = null;
    if (manifest.identity.transport_id !== "cli_process") reasons.push("OPERATIONAL_TRANSPORT_OWNER_UNAVAILABLE");
    if (manifest.requires_observation) {
      try {
        observation = validateFreshCustomObservation({ manifest, observation: observationFor(manifest, observations), verifier: observationVerifier, now });
      } catch (error) {
        reasons.push(error?.message ?? "PROVIDER_OBSERVATION_INVALID");
      }
    }
    if (!certification) reasons.push("CERTIFICATION_MISSING");
    else {
      const certificationFingerprint = digest(certification);
      let certificationTrusted = false;
      if (certificationVerifier?.trusted === true && typeof certificationVerifier.verify === "function") {
        const verdict = certificationVerifier.verify({ manifest: structuredClone(manifest), certification: structuredClone(certification), fingerprint: certificationFingerprint, now });
        if (verdict && typeof verdict.then === "function") throw new Error("CERTIFICATION_VERIFIER_ASYNC_UNSUPPORTED");
        certificationTrusted = verdict?.verified === true
          && verdict.fingerprint === certificationFingerprint
          && verdict.certification_id === certification.certification_id
          && verdict.certifier_id === certification.certifier_id
          && verdict.identity_key === certification.identity_key
          && verdict.authority_fingerprint === certification.authority_fingerprint;
      }
      if (!certificationTrusted) reasons.push("CERTIFICATION_PROVENANCE_UNTRUSTED");
      if (certification.state !== "CERTIFIED") reasons.push(`CERTIFICATION_${certification.state}`);
      if (certification.manifest_version !== manifest.version) reasons.push("MANIFEST_VERSION_DRIFT");
      if (certification.platform !== platform) reasons.push("PLATFORM_MISMATCH");
      if (certification.capability_fingerprint !== digest(manifest.capabilities)) reasons.push("CAPABILITY_DRIFT");
      if (Number.isNaN(Date.parse(certification.expires_at)) || Date.parse(certification.expires_at) < Date.parse(now)) reasons.push("CERTIFICATION_EXPIRED");
      if (manifest.requires_observation && observation && certification.observation_fingerprint !== observation.fingerprint) reasons.push("CERTIFICATION_OBSERVATION_MISMATCH");
    }
    return { manifest, certification: certification ?? null, observation, eligible: reasons.length === 0, blockers: [...new Set(reasons)].sort() };
  }).sort((a, b) => a.manifest.identity_key.localeCompare(b.manifest.identity_key));
  const snapshot = { schema_version: "1.0.0", observed_at: now, platform, entries };
  return { ...snapshot, fingerprint: digest(snapshot) };
}

function eligibility(entry, requirements, authority, budget) {
  const blockers = [...entry.blockers];
  for (const capability of requirements.capabilities ?? []) if (!entry.manifest.capabilities.includes(capability)) blockers.push(`CAPABILITY_MISSING:${capability}`);
  if (requirements.native_reasoning && !entry.manifest.native_reasoning_values.includes(requirements.native_reasoning)) blockers.push("NATIVE_REASONING_UNSUPPORTED");
  if (requirements.normalized_effort && !Object.values(entry.manifest.effort_mapping).includes(requirements.normalized_effort)) blockers.push("NORMALIZED_EFFORT_UNSUPPORTED");
  if (authority?.decision !== "ALLOW") blockers.push("AUTHORITY_DENIED");
  for (const [key, value] of Object.entries(budget ?? {})) if (Number.isFinite(entry.manifest.resource_bounds[key]) && entry.manifest.resource_bounds[key] > value) blockers.push(`BUDGET_EXCEEDED:${key}`);
  return [...new Set(blockers)].sort();
}

export function selectAgentConfiguration({ registry, policy, inheritanceChain = [], requirements = {}, authority, budget = {} }) {
  if (!registry?.entries || !policy || !new Set(["auto", "manual", "inherit"]).has(policy.mode)) throw new Error("SELECTION_INPUT_INVALID");
  let requested;
  const trace = [];
  if (policy.mode === "manual") requested = policy.identity_key;
  if (policy.mode === "inherit") {
    const byScope = new Map(inheritanceChain.map((entry) => [entry.scope, entry]));
    for (const scope of INHERITANCE_ORDER) {
      const entry = byScope.get(scope);
      trace.push({ scope, present: Boolean(entry), identity_key: entry?.identity_key ?? null, valid: entry?.valid ?? null });
      if (!entry) continue;
      if (entry.valid !== true || typeof entry.identity_key !== "string") return { decision: "STOP", code: "NEAREST_INHERITED_SOURCE_INVALID", inheritance_trace: trace };
      requested = entry.identity_key;
      break;
    }
    if (!requested) return { decision: "STOP", code: "NO_INHERITED_SELECTION", inheritance_trace: trace };
  }
  const evaluated = registry.entries.map((entry) => ({ entry, blockers: eligibility(entry, requirements, authority, budget) }));
  const ranked = [...evaluated].sort((a, b) => a.entry.manifest.priority - b.entry.manifest.priority || a.entry.manifest.estimated_cost - b.entry.manifest.estimated_cost || a.entry.manifest.identity_key.localeCompare(b.entry.manifest.identity_key));
  const selectionLineage = ranked.map((item, index) => ({ rank: index + 1, identity_key: item.entry.manifest.identity_key, eligible: item.blockers.length === 0, blockers: [...item.blockers], registry_fingerprint: registry.fingerprint, observed_at: registry.observed_at }));
  let selected;
  if (policy.mode === "auto") selected = ranked.find((item) => item.blockers.length === 0);
  else selected = evaluated.find((item) => item.entry.manifest.identity_key === requested);
  if (!selected && policy.mode === "auto" && evaluated.length > 0) {
    return { decision: "STOP", code: "SELECTION_INELIGIBLE", requested: "auto", blockers: [...new Set(evaluated.flatMap((item) => item.blockers))].sort(), inheritance_trace: trace };
  }
  if (!selected) return { decision: "STOP", code: "SELECTION_NOT_FOUND", requested: requested ?? null, inheritance_trace: trace };
  if (selected.blockers.length) return { decision: "STOP", code: "SELECTION_INELIGIBLE", requested: selected.entry.manifest.identity_key, blockers: selected.blockers, inheritance_trace: trace };
  if (policy.previous_effective && policy.previous_effective !== selected.entry.manifest.identity_key && (typeof policy.reselection_reason !== "string" || policy.reselection_reason.length === 0)) return { decision: "STOP", code: "RESELECTION_REASON_REQUIRED", requested: requested ?? "auto", previous_effective: policy.previous_effective, proposed_effective: selected.entry.manifest.identity_key, selection_lineage: selectionLineage };
  const selectedRank = selectionLineage.find((item) => item.identity_key === selected.entry.manifest.identity_key)?.rank ?? 1;
  const result = { decision: "PASS", mode: policy.mode, requested: requested ?? "auto", selected: selected.entry.manifest.identity_key, effective: selected.entry.manifest.identity_key, previous_effective: policy.previous_effective ?? null, reselection_reason: policy.reselection_reason ?? null, fallback_count: policy.mode === "auto" ? selectedRank - 1 : 0, selection_lineage: selectionLineage, manifest: selected.entry.manifest, inheritance_trace: trace, actual_observed: null };
  return { ...result, fingerprint: digest(result) };
}

export function createSelectionDryRun({ change, baseRevision, before, after, affectedAgents, authorityDelta, capabilityDelta, costDelta, networkDelta, blockers = [], expiresAt }) {
  const result = { schema_version: "1.0.0", change, base_revision: baseRevision, before, after, affected_agents: [...affectedAgents].sort(), authority_delta: authorityDelta, capability_delta: capabilityDelta, cost_delta: costDelta, network_delta: networkDelta, blockers: [...blockers].sort(), expires_at: expiresAt, grants_authority: false };
  return { ...result, fingerprint: digest(result) };
}

export function createLaunchIntent({ grant, selection, effective, context, reservation, targets, authorityEpoch, intentId, createdAt }) {
  if (selection?.decision !== "PASS") throw new Error("SELECTION_NOT_ADMITTED");
  if (!Array.isArray(targets) || targets.length === 0 || targets.some((target) => typeof target !== "string" || target.length === 0)) throw new Error("LAUNCH_TARGETS_REQUIRED");
  const normalizedTargets = [...new Set(targets)].sort();
  if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("LAUNCH_AUTHORITY_EPOCH_REQUIRED");
  const intent = { schema_version: "1.0.0", intent_id: requireString(intentId, "LAUNCH_INTENT_ID_REQUIRED"), grant_fingerprint: requireString(grant?.fingerprint, "GRANT_FINGERPRINT_REQUIRED"), requested: selection.requested, selected: selection.selected, effective: effective ?? selection.effective, actual_observed: null, context_fingerprint: requireString(context?.fingerprint, "CONTEXT_FINGERPRINT_REQUIRED"), reservation_id: requireString(reservation?.reservation_id, "RESERVATION_REQUIRED"), authority_epoch: authorityEpoch, targets: normalizedTargets, created_at: requireString(createdAt, "LAUNCH_TIME_REQUIRED") };
  return { ...intent, fingerprint: digest(intent) };
}

export function simulateAgentStart({ intent, observedConfiguration }) {
  if (intent.actual_observed !== null) throw new Error("PRESPAWN_ACTUAL_MUST_BE_ABSENT");
  if (observedConfiguration !== undefined && observedConfiguration !== null) throw new Error("SIMULATION_CANNOT_ACCEPT_ACTUAL_OBSERVATION");
  return { decision: "PASS", simulation: true, process_spawned: false, network_used: false, intent_fingerprint: intent.fingerprint };
}

export function admitAgentRun({ intent, grant, actualObserved, observationProof, verifier, admittedAt }) {
  if (!verifier || verifier.independent !== true || typeof verifier.verifier_id !== "string" || verifier.verifier_id.length === 0 || typeof verifier.verify !== "function") throw new Error("INDEPENDENT_AGENT_OBSERVATION_VERIFIER_REQUIRED");
  const verified = verifier.verify({ intent: structuredClone(intent), candidate_observation: structuredClone(actualObserved), candidate_proof: structuredClone(observationProof) });
  if (verified && typeof verified.then === "function") throw new Error("ASYNC_AGENT_OBSERVATION_VERIFIER_UNSUPPORTED");
  const verifiedObserved = verified?.actual_observed;
  const verifiedProof = verified?.observation_proof;
  if (!verifiedObserved || typeof verifiedObserved !== "object" || verifiedObserved.placeholder === true || verifiedObserved.predicted === true) throw new Error("ACTUAL_OBSERVATION_INVALID");
  if (!actualObserved || digest(actualObserved) !== digest(verifiedObserved)) return { decision: "STOP", code: "INDEPENDENT_OBSERVATION_MISMATCH" };
  if (!verifiedObserved.process_identity || typeof verifiedObserved.process_identity !== "object" || Array.isArray(verifiedObserved.process_identity)) throw new Error("ACTUAL_PROCESS_IDENTITY_REQUIRED");
  for (const field of ["process_id", "adapter_instance_id", "executable_fingerprint"]) requireString(verifiedObserved.process_identity[field], `ACTUAL_PROCESS_IDENTITY_FIELD_REQUIRED:${field}`);
  if (!verifiedObserved.sandbox || typeof verifiedObserved.sandbox !== "object" || Array.isArray(verifiedObserved.sandbox) || typeof verifiedObserved.sandbox.mode !== "string") throw new Error("ACTUAL_SANDBOX_REQUIRED");
  if (!Array.isArray(verifiedObserved.capabilities) || verifiedObserved.capabilities.some((capability) => typeof capability !== "string" || capability.length === 0)) throw new Error("ACTUAL_CAPABILITIES_REQUIRED");
  if (!Array.isArray(verifiedObserved.targets) || verifiedObserved.targets.some((target) => typeof target !== "string" || target.length === 0)) throw new Error("ACTUAL_TARGETS_REQUIRED");
  const observedTargets = [...new Set(verifiedObserved.targets)].sort();
  if (digest(observedTargets) !== digest(intent.targets)) return { decision: "STOP", code: "ACTUAL_TARGETS_MISMATCH", expected: intent.targets, actual: observedTargets };
  const grantBoundaryFailure = validateObservedGrantBoundary(verifiedObserved, grant);
  if (grantBoundaryFailure) return { decision: "STOP", code: grantBoundaryFailure };
  const actualKey = providerIdentityKey(verifiedObserved.identity);
  if (actualKey !== intent.effective) return { decision: "STOP", code: "ACTUAL_CONFIGURATION_MISMATCH", expected: intent.effective, actual: actualKey };
  const observationFingerprint = digest(verifiedObserved);
  if (!verifiedProof || verifiedProof.verified !== true || verifiedProof.independent !== true || verifiedProof.verified_by !== verifier.verifier_id || verifiedProof.fingerprint !== observationFingerprint || typeof verifiedProof.evidence_strength !== "string" || verifiedProof.evidence_strength.length === 0) return { decision: "STOP", code: "ACTUAL_OBSERVATION_PROOF_INVALID" };
  const proofFingerprint = digest({ verifier_id: verifier.verifier_id, observation_fingerprint: observationFingerprint, evidence_strength: verifiedProof.evidence_strength });
  const attestation = { schema_version: "1.0.0", requested: intent.requested, selected: intent.selected, effective: intent.effective, actual_observed: { ...verifiedObserved, targets: observedTargets, capabilities: [...new Set(verifiedObserved.capabilities)].sort(), fingerprint: observationFingerprint }, observed_at: requireString(admittedAt, "ADMISSION_TIME_REQUIRED"), evidence_strength: verifiedProof.evidence_strength, verifier_id: verifier.verifier_id, observation_proof_fingerprint: proofFingerprint };
  return { decision: "PASS", attestation: { ...attestation, fingerprint: digest(attestation) } };
}

export function buildCliLaunchPlan({ manifest, promptFile, responseFile, modelId, nativeReasoning, sandbox, workingDirectory }) {
  const normalized = normalizeManifest(manifest);
  if (normalized.identity.transport_id !== "cli_process") throw new Error("CLI_TRANSPORT_REQUIRED");
  for (const value of [promptFile, responseFile, workingDirectory]) if (!isAbsolute(value)) throw new Error("CLI_PATH_MUST_BE_ABSOLUTE");
  if (modelId !== normalized.identity.model_id) throw new Error("CLI_MODEL_MISMATCH");
  if (!normalized.native_reasoning_values.includes(nativeReasoning)) throw new Error("CLI_REASONING_UNSUPPORTED");
  const descriptor = normalized.transport_descriptor;
  if (normalized.custom) {
    const policy = descriptor.execution_policy;
    if (!absolutePathWithin(policy.allowed_working_roots, workingDirectory)) throw new Error("CLI_WORKING_DIRECTORY_FORBIDDEN");
    if (!absolutePathWithin(policy.allowed_response_roots, dirname(responseFile))) throw new Error("CLI_RESPONSE_DIRECTORY_FORBIDDEN");
  }
  const executable = descriptor.executable?.canonical_path;
  requireString(executable, "CLI_EXECUTABLE_REQUIRED");
  validateArgvTemplate(descriptor.argv_template, descriptor.argv_schema);
  const values = {
    sandbox,
    model_id: modelId,
    native_reasoning: nativeReasoning,
    reasoning_config: `model_reasoning_effort=${JSON.stringify(nativeReasoning)}`,
    working_directory: workingDirectory,
    response_file: responseFile,
    stdin_marker: "-",
  };
  const argv = descriptor.argv_template.map((token) => /^\{\{[a-z_]+\}\}$/.test(token) ? values[token.slice(2, -2)] : token);
  const core = { transport: "cli_process", executable, executable_descriptor: structuredClone(descriptor.executable), interpreter_descriptor: structuredClone(descriptor.interpreter ?? null), model_id: modelId, native_reasoning: nativeReasoning, sandbox, argv, working_directory: workingDirectory, stdin_file: promptFile, response_file: responseFile, shell: false, environment: {}, environment_allowlist: [...descriptor.environment_allowlist], execution_policy: structuredClone(descriptor.execution_policy ?? null), implicit_network_authority: false, requires_executable_revalidation: true };
  return { ...core, fingerprint: digest(core) };
}

const CLI_TEMPLATE_VALUES = new Set(["sandbox", "model_id", "native_reasoning", "reasoning_config", "working_directory", "response_file", "stdin_marker"]);

function validateArgvTemplate(template, schema) {
  if (!Array.isArray(template) || template.length === 0 || template.some((token) => typeof token !== "string" || (!/^\{\{[a-z_]+\}\}$/.test(token) && (!/^[A-Za-z0-9._:=,+\/-]+$/.test(token) || /[;&|`$<>]/.test(token))))) throw new Error("CLI_ARGV_TEMPLATE_INVALID");
  const names = template.filter((token) => /^\{\{[a-z_]+\}\}$/.test(token)).map((token) => token.slice(2, -2));
  if (names.some((name) => !CLI_TEMPLATE_VALUES.has(name)) || !Array.isArray(schema) || [...new Set(names)].sort().join("\0") !== [...new Set(schema)].sort().join("\0")) throw new Error("CLI_ARGV_SCHEMA_MISMATCH");
  return names;
}

export function authorizeCliLaunchPlan({ manifest, plan, executableObservation }) {
  if (!plan || plan.shell !== false || plan.requires_executable_revalidation !== true) throw new Error("CLI_LAUNCH_PLAN_INVALID");
  const normalized = normalizeManifest(manifest);
  const identity = validateExecutableDescriptor(normalized.transport_descriptor.executable, executableObservation);
  if (normalized.custom) {
    const policy = normalized.transport_descriptor.execution_policy;
    if (!policy.allowed_owner_uids.includes(identity.uid) || (identity.mode & ~policy.executable_mode_mask) !== 0) throw new Error("CLI_EXECUTABLE_OWNER_OR_MODE_FORBIDDEN");
  }
  if (plan.executable !== identity.path || plan.executable_descriptor.digest !== identity.digest) throw new Error("CLI_EXECUTABLE_PLAN_DRIFT");
  const interpreterIdentity = normalized.transport_descriptor.interpreter ? validateExecutableDescriptor(normalized.transport_descriptor.interpreter, executableObservation?.interpreter_observation ?? { path: normalized.transport_descriptor.interpreter.canonical_path }) : null;
  if (canonicalJson(plan.interpreter_descriptor) !== canonicalJson(normalized.transport_descriptor.interpreter ?? null)) throw new Error("CLI_INTERPRETER_PLAN_DRIFT");
  const { fingerprint, ...core } = plan;
  if (digest(core) !== fingerprint) throw new Error("CLI_LAUNCH_PLAN_FINGERPRINT_MISMATCH");
  return { decision: "PASS", descriptor_pinned: true, executable_identity: identity, interpreter_identity: interpreterIdentity, plan_fingerprint: fingerprint, fingerprint: digest({ identity, interpreterIdentity, fingerprint }) };
}

export function pinExecutableDescriptor({ descriptor, observation } = {}) {
  const admitted = validateExecutableDescriptor(descriptor, observation);
  let descriptorFd;
  try {
    descriptorFd = openSync(admitted.path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const stats = fstatSync(descriptorFd);
    if (!stats.isFile() || stats.dev !== admitted.device || stats.ino !== admitted.inode || digest(readFileSync(descriptorFd)) !== admitted.digest) throw new Error("EXECUTABLE_CHANGED_DURING_PIN");
    return {
      descriptor_fd: descriptorFd,
      proc_path: `/proc/self/fd/${descriptorFd}`,
      identity: { ...admitted, device: stats.dev, inode: stats.ino },
      close() {
        if (descriptorFd !== null) {
          closeSync(descriptorFd);
          descriptorFd = null;
        }
      },
    };
  } catch (error) {
    if (descriptorFd !== undefined && descriptorFd !== null) closeSync(descriptorFd);
    throw error;
  }
}

export async function dispatchCliLaunchPlan({ manifest, plan, executableObservation, executor, inheritedEnvironment = process.env, authorityFence } = {}) {
  if (!executor || executor.descriptor_pinned !== true || typeof executor.execute !== "function") throw new Error("DESCRIPTOR_PINNED_EXECUTOR_REQUIRED");
  if (authorityFence !== undefined && authorityFence !== null && executor.authority_fence_enforced !== true) throw new Error("CLI_AUTHORITY_FENCE_ENFORCEMENT_UNAVAILABLE");
  const rebuilt = buildCliLaunchPlan({ manifest, promptFile: plan?.stdin_file, responseFile: plan?.response_file, modelId: plan?.model_id, nativeReasoning: plan?.native_reasoning, sandbox: plan?.sandbox, workingDirectory: plan?.working_directory });
  if (rebuilt.fingerprint !== plan?.fingerprint) throw new Error("CLI_EXECUTION_PLAN_NOT_CANONICAL");
  const admission = authorizeCliLaunchPlan({ manifest, plan, executableObservation });
  const pinned = pinExecutableDescriptor({ descriptor: plan.executable_descriptor, observation: executableObservation });
  const pinnedInterpreter = plan.interpreter_descriptor ? pinExecutableDescriptor({ descriptor: plan.interpreter_descriptor, observation: executableObservation?.interpreter_observation ?? { path: plan.interpreter_descriptor.canonical_path } }) : null;
  try {
    const environment = {};
    for (const name of plan.environment_allowlist ?? []) if (typeof inheritedEnvironment[name] === "string") environment[name] = inheritedEnvironment[name];
    assertNoSecretMaterial(environment, "CLI_INHERITED_SECRET_FORBIDDEN");
    const result = await executor.execute({
      executable_path: pinned.proc_path,
      executable_fd: pinned.descriptor_fd,
      executable_identity: structuredClone(pinned.identity),
      interpreter_path: pinnedInterpreter?.proc_path ?? null,
      interpreter_fd: pinnedInterpreter?.descriptor_fd ?? null,
      interpreter_identity: pinnedInterpreter ? structuredClone(pinnedInterpreter.identity) : null,
      argv: [...plan.argv],
      working_directory: plan.working_directory,
      stdin_file: plan.stdin_file,
      response_file: plan.response_file,
      environment,
      execution_policy: structuredClone(plan.execution_policy),
      authority_fence: authorityFence ?? null,
      shell: false,
      plan_fingerprint: admission.plan_fingerprint,
    });
    if (!result || result.descriptor_pinned !== true || result.plan_fingerprint !== admission.plan_fingerprint || !Number.isSafeInteger(result.exit_code)) throw new Error("CLI_EXECUTOR_RESULT_INVALID");
    assertNoSecretMaterial(result, "CLI_EXECUTOR_SECRET_RESULT_FORBIDDEN");
    return structuredClone(result);
  } finally {
    pinnedInterpreter?.close();
    pinned.close();
  }
}

export function createNodeDescriptorPinnedExecutor({ spawnRunner = spawnSync, timeoutMs = 30 * 60 * 1000, maxResponseBytes = 4 * 1024 * 1024, maxStderrBytes = 1024 * 1024 } = {}) {
  if (typeof spawnRunner !== "function" || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0 || !Number.isSafeInteger(maxStderrBytes) || maxStderrBytes <= 0) throw new Error("CLI_EXECUTOR_CONFIGURATION_INVALID");
  return {
    descriptor_pinned: true,
    authority_fence_enforced: false,
    async execute(input) {
      if (!input || !Number.isSafeInteger(input.executable_fd) || input.executable_fd < 0 || input.shell !== false || !Array.isArray(input.argv) || !isAbsolute(input.working_directory) || !isAbsolute(input.stdin_file) || !isAbsolute(input.response_file)) throw new Error("CLI_EXECUTOR_INPUT_INVALID");
      if (input.authority_fence !== null && input.authority_fence !== undefined) throw new Error("CLI_AUTHORITY_FENCE_ENFORCEMENT_UNAVAILABLE");
      const responseDirectory = dirname(input.response_file);
      const policy = input.execution_policy;
      if (policy !== null && policy !== undefined) {
        if (!absolutePathWithin(policy.allowed_working_roots, input.working_directory) || !absolutePathWithin(policy.allowed_response_roots, responseDirectory)) throw new Error("CLI_EXECUTOR_PATH_POLICY_VIOLATION");
        if (policy.timeout_ms > timeoutMs || policy.max_response_bytes > maxResponseBytes || policy.max_stderr_bytes > maxStderrBytes || !Number.isSafeInteger(policy.max_prompt_bytes) || policy.max_prompt_bytes <= 0) throw new Error("CLI_EXECUTOR_BOUND_EXPANSION");
      }
      const effectiveTimeoutMs = policy?.timeout_ms ?? timeoutMs;
      const effectivePromptBytes = policy?.max_prompt_bytes ?? 4 * 1024 * 1024;
      const effectiveResponseBytes = policy?.max_response_bytes ?? maxResponseBytes;
      const effectiveStderrBytes = policy?.max_stderr_bytes ?? maxStderrBytes;
      let responseDirectoryFd;
      let pinnedResponsePath;
      let responseCreated = false;
      let promptFd;
      let responseFd;
      try {
        responseDirectoryFd = openSync(responseDirectory, fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0) | (fsConstants.O_NOFOLLOW ?? 0));
        const directoryStat = fstatSync(responseDirectoryFd);
        const allowedOwnerUids = policy?.allowed_owner_uids ?? [process.getuid?.()];
        if (!directoryStat.isDirectory()
          || (directoryStat.mode & 0o777) !== 0o700
          || !allowedOwnerUids.includes(directoryStat.uid)
          || realpathSync(responseDirectory) !== responseDirectory) throw new Error("CLI_RESPONSE_DIRECTORY_INVALID");
        const responseName = basename(input.response_file);
        if (!responseName || responseName === "." || responseName === ".." || input.response_file !== resolve(responseDirectory, responseName)) throw new Error("CLI_RESPONSE_FILE_NAME_INVALID");
        pinnedResponsePath = `/proc/self/fd/${responseDirectoryFd}/${responseName}`;
        if (existsSync(pinnedResponsePath)) throw new Error("CLI_RESPONSE_FILE_ALREADY_EXISTS");
        promptFd = openSync(input.stdin_file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
        const promptStat = fstatSync(promptFd);
        if (!promptStat.isFile() || promptStat.size > effectivePromptBytes || (promptStat.mode & 0o077) !== 0) throw new Error("CLI_PROMPT_FILE_INVALID");
        responseFd = openSync(pinnedResponsePath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0), 0o600);
        responseCreated = true;
        const createdResponseStat = fstatSync(responseFd);
        if (!createdResponseStat.isFile() || (createdResponseStat.mode & 0o077) !== 0 || createdResponseStat.uid !== directoryStat.uid) throw new Error("CLI_RESPONSE_FILE_INVALID");
        closeSync(responseFd);
        responseFd = undefined;
        const hasInterpreter = input.interpreter_fd !== null && input.interpreter_fd !== undefined;
        // Node maps each numeric stdio entry from the parent descriptor to that
        // stable child descriptor. Fixed child slots make `/proc/self/fd/*`
        // resolve after the spawn fd actions without depending on the parent's
        // incidental descriptor numbers.
        const stdio = hasInterpreter
          ? [promptFd, "ignore", "pipe", input.interpreter_fd, input.executable_fd, responseDirectoryFd]
          : [promptFd, "ignore", "pipe", input.executable_fd, responseDirectoryFd];
        const executablePath = "/proc/self/fd/3";
        const childResponsePath = `/proc/self/fd/${hasInterpreter ? 5 : 4}/${responseName}`;
        if (!input.argv.includes(input.response_file)) throw new Error("CLI_RESPONSE_ARGUMENT_REQUIRED");
        const pinnedArgv = input.argv.map((argument) => argument === input.response_file ? childResponsePath : argument);
        const argv = hasInterpreter ? ["/proc/self/fd/4", ...pinnedArgv] : pinnedArgv;
        const result = spawnRunner(executablePath, argv, { cwd: input.working_directory, env: input.environment, shell: false, encoding: "utf8", timeout: effectiveTimeoutMs, maxBuffer: effectiveStderrBytes, stdio });
        if (result?.error) throw result.error;
        if (!Number.isSafeInteger(result?.status)) throw new Error("CLI_PROCESS_STATUS_INVALID");
        responseFd = openSync(pinnedResponsePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
        const responseStat = fstatSync(responseFd);
        if (!responseStat.isFile() || responseStat.dev !== createdResponseStat.dev || responseStat.ino !== createdResponseStat.ino || responseStat.uid !== createdResponseStat.uid || (responseStat.mode & 0o077) !== 0 || responseStat.size > effectiveResponseBytes) throw new Error("CLI_RESPONSE_FILE_INVALID");
        const responseFingerprint = digest(readFileSync(responseFd));
        const core = { descriptor_pinned: true, plan_fingerprint: input.plan_fingerprint, exit_code: result.status, signal: result.signal ?? null, executable_fingerprint: input.executable_identity.digest, interpreter_fingerprint: input.interpreter_identity?.digest ?? null, response_fingerprint: responseFingerprint, response_size: responseStat.size, stderr: redactSecretText(result.stderr ?? "").slice(0, effectiveStderrBytes), fencing_enforced: false, authority_epoch: null, fence_fingerprint: null };
        assertNoSecretMaterial(core, "CLI_EXECUTOR_SECRET_RESULT_FORBIDDEN");
        return core;
      } finally {
        if (promptFd !== undefined) closeSync(promptFd);
        if (responseFd !== undefined) closeSync(responseFd);
        if (responseCreated && pinnedResponsePath) {
          try { unlinkSync(pinnedResponsePath); } catch { throw new Error("CLI_RESPONSE_FILE_CLEANUP_FAILED"); }
        }
        if (responseDirectoryFd !== undefined) closeSync(responseDirectoryFd);
      }
    },
  };
}

export function buildApiRequestPlan({ manifest, method, requestBody, endpointObservation, now = new Date().toISOString() }) {
  const normalized = validateCustomManifest(manifest, { endpointObservation }).manifest;
  if (normalized.identity.transport_id !== "api_request") throw new Error("API_TRANSPORT_REQUIRED");
  const descriptor = normalized.transport_descriptor;
  if (!descriptor.methods.includes(method)) throw new Error("API_METHOD_FORBIDDEN");
  assertNoSecretMaterial(requestBody, "RAW_SECRET_IN_API_REQUEST");
  validateSchemaValue(requestBody, descriptor.request_schema, "$.request");
  if (Buffer.byteLength(canonicalJson(requestBody)) > descriptor.request_policy.max_request_bytes) throw new Error("API_REQUEST_SIZE_EXCEEDED");
  const secretReference = validateSecretReference(descriptor.secret_reference, { now, ...secretReferencePolicyOptions(descriptor.secret_reference_policy) });
  const endpoint = validateEndpointObservation(descriptor.endpoint, endpointObservation);
  const core = { transport: "api_request", method, endpoint, request_schema: structuredClone(descriptor.request_schema), response_schema: structuredClone(descriptor.response_schema), request_policy: structuredClone(descriptor.request_policy), response_attestation_required: true, request_body: structuredClone(requestBody), secret_reference_fingerprint: secretReference.fingerprint, shell: false, implicit_network_authority: false, requires_gateway_dispatch: true };
  return { ...core, fingerprint: digest(core) };
}

export async function dispatchApiRequestPlan({ plan } = {}) {
  if (!plan || plan.transport !== "api_request" || plan.requires_gateway_dispatch !== true) throw new Error("API_DISPATCH_PLAN_INVALID");
  throw new Error("API_OPERATIONAL_TRANSPORT_UNAVAILABLE");
}

export function buildLocalRuntimePlan({ manifest, operation, payload, endpointObservation }) {
  const normalized = validateCustomManifest(manifest, { endpointObservation }).manifest;
  if (normalized.identity.transport_id !== "local_runtime") throw new Error("LOCAL_RUNTIME_TRANSPORT_REQUIRED");
  const descriptor = normalized.transport_descriptor;
  if (!Array.isArray(descriptor.operations) || !descriptor.operations.includes(operation)) throw new Error("LOCAL_RUNTIME_OPERATION_FORBIDDEN");
  assertNoSecretMaterial(payload, "RAW_SECRET_IN_LOCAL_RUNTIME_REQUEST");
  const endpoint = validateEndpointObservation(descriptor.endpoint, endpointObservation, { localRuntime: true });
  const core = { transport: "local_runtime", operation, endpoint, payload: structuredClone(payload), start_stop_authority: descriptor.start_stop_authority, shell: false, implicit_network_authority: false, requires_gateway_dispatch: true };
  return { ...core, fingerprint: digest(core) };
}

function selectorMatches(expected, actual) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) return false;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return Object.keys(expected).length === 0;
  return Object.entries(expected).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return selectorMatches(value, actual[key]);
    return canonicalJson(actual[key]) === canonicalJson(value);
  });
}

export function createOperationalProviderAdapter({ registryProvider, observer, cliExecutor, dispatchFenceGuard, apiTransport, localTransport, secretResolver, endpointObservationProvider, clock = () => new Date().toISOString() } = {}) {
  if (typeof registryProvider !== "function" || !observer || typeof observer.observe !== "function" || typeof observer.reconcile !== "function" || typeof dispatchFenceGuard !== "function") throw new Error("OPERATIONAL_PROVIDER_ADAPTER_DEPENDENCY_REQUIRED");
  function selectedManifest(effect) {
    const identityKey = effect?.request?.provider_execution?.identity_key ?? effect?.request?.intent?.effective;
    const entry = registryProvider().entries?.find((candidate) => candidate.manifest.identity_key === identityKey);
    if (!entry || entry.eligible !== true) throw new Error("OPERATIONAL_PROVIDER_NOT_ELIGIBLE");
    return entry.manifest;
  }
  return {
    async observe({ target, action }) {
      const observation = await observer.observe({ target: structuredClone(target), action });
      if (!observation || typeof observation.fingerprint !== "string" || typeof observation.object_identity !== "string") throw new Error("OPERATIONAL_PROVIDER_OBSERVATION_INVALID");
      return observation;
    },
    async dispatch({ effect, decision, observation, effect_id: effectId, effect_key: effectKey, authority_epoch: authorityEpoch, fencing_token: fencingToken }) {
      const execution = effect?.request?.provider_execution;
      if (!execution || execution.plan?.fingerprint !== execution.plan_fingerprint) throw new Error("PROVIDER_EXECUTION_PLAN_REQUIRED");
      if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0 || typeof fencingToken !== "string" || fencingToken !== digest({ effect_id: effectId, authority_fingerprint: decision?.fingerprint, authority_epoch: authorityEpoch })) throw new Error("PROVIDER_DISPATCH_FENCE_REQUIRED");
      const manifest = selectedManifest(effect);
      let result;
      if (manifest.identity.transport_id === "cli_process") result = await dispatchCliLaunchPlan({ manifest, plan: execution.plan, executableObservation: execution.executable_observation, executor: cliExecutor, inheritedEnvironment: execution.inherited_environment ?? {}, authorityFence: { authority_epoch: authorityEpoch, fencing_token: fencingToken, effect_id: effectId, effect_key: effectKey, guard: dispatchFenceGuard } });
      else if (manifest.identity.transport_id === "api_request") throw new Error("API_OPERATIONAL_TRANSPORT_UNAVAILABLE");
      else {
        throw new Error("LOCAL_RUNTIME_OPERATIONAL_TRANSPORT_UNAVAILABLE");
      }
      if (result?.fencing_enforced !== true || result.authority_epoch !== authorityEpoch || result.fence_fingerprint !== digest(fencingToken)) throw new Error("PROVIDER_DISPATCH_FENCE_NOT_ENFORCED");
      return { ...result, effect_id: effectId, effect_key: effectKey };
    },
    matches({ expected, dispatchResult, observation }) {
      return dispatchResult?.effect_key === observation.effect_key && selectorMatches(expected, observation);
    },
    async reconcile(intent) {
      return observer.reconcile(structuredClone(intent));
    },
  };
}

export function providerDigest(value) {
  return digest(value);
}
