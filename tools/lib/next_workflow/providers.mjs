import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, constants as fsConstants, existsSync, fstatSync, lstatSync, openSync, readFileSync, readSync, realpathSync, unlinkSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isIP } from "node:net";
import { assertNoSecretMaterial, redactSecretText, validateSecretReferenceShape } from "./secret_policy.mjs";
import { assertProtectedRunLifecyclePort } from "./run_lifecycle.mjs";

const IDENTITY_FIELDS = ["execution_provider_id", "model_publisher_id", "agent_product_id", "adapter_id", "transport_id", "model_id"];
const TRANSPORTS = new Set(["cli_process", "api_request", "local_runtime"]);
const CERTIFICATION_STATES = new Set(["CANDIDATE", "CERTIFIED", "EXPIRED", "REVOKED", "FAILED", "DEGRADED", "UNAVAILABLE", "REPROBE_REQUIRED"]);
const INHERITANCE_ORDER = ["agent", "role", "team", "repository", "context", "global"];
const OBSERVATION_TRUST_CLASS = "trusted_runtime_observation";
const NORMALIZED_REASONING_VALUES = new Set(["none", "minimal", "low", "medium", "balanced", "high", "enhanced", "xhigh", "max"]);
const AUTHORITY_FENCED_CLI_EXECUTORS = new WeakSet();

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(input).digest("hex");
}

function readPinnedFile(fd, size) {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, bytes, offset, size - offset, offset);
    if (count === 0) throw new Error("CLI_PINNED_FILE_SHORT_READ");
    offset += count;
  }
  return bytes;
}

export function assertProtectedAuthorityFencedCliExecutor(executor) {
  if (!executor || !AUTHORITY_FENCED_CLI_EXECUTORS.has(executor)) throw new Error("PROTECTED_AUTHORITY_FENCED_CLI_EXECUTOR_REQUIRED");
  return executor;
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
  const nativeValues = [...new Set(manifest.native_reasoning_values)].sort();
  if (nativeValues.some((value) => typeof value !== "string" || value.length === 0) || Object.keys(manifest.effort_mapping).sort().join("\0") !== nativeValues.join("\0") || Object.values(manifest.effort_mapping).some((value) => !NORMALIZED_REASONING_VALUES.has(value))) throw new Error("PROVIDER_EFFORT_MAPPING_INVALID");
  const mappingProvenance = manifest.reasoning_mapping_provenance;
  if (!mappingProvenance || typeof mappingProvenance.source_id !== "string" || typeof mappingProvenance.revision !== "string" || typeof mappingProvenance.reviewed_by !== "string" || !/^[a-f0-9]{64}$/.test(mappingProvenance.proof_fingerprint ?? "")) throw new Error("PROVIDER_EFFORT_MAPPING_PROVENANCE_REQUIRED");
  const selectionProfile = manifest.selection_profile ?? { correctness: 0, safety: 0, efficiency: 0, roles: [] };
  if (![selectionProfile.correctness, selectionProfile.safety, selectionProfile.efficiency].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 100) || !Array.isArray(selectionProfile.roles) || selectionProfile.roles.some((role) => typeof role !== "string" || role.length === 0)) throw new Error("PROVIDER_SELECTION_PROFILE_INVALID");
  const certificationProfile = manifest.certification_profile;
  if (!certificationProfile || certificationProfile.probe_authority !== "independent" || certificationProfile.certification_authority !== "independent" || certificationProfile.isolated_probe !== true) throw new Error("PROVIDER_CERTIFICATION_PROFILE_INVALID");
  if (!Object.hasOwn(manifest, "resource_bounds")) throw new Error("PROVIDER_RESOURCE_BOUNDS_REQUIRED");
  const resourceBounds = manifest.resource_bounds;
  if (!resourceBounds || typeof resourceBounds !== "object" || Array.isArray(resourceBounds) || Object.keys(resourceBounds).length === 0 || Object.entries(resourceBounds).some(([key, value]) => typeof key !== "string" || key.length === 0 || !Number.isFinite(value) || value < 0)) throw new Error("PROVIDER_RESOURCE_BOUNDS_INVALID");
  if (!Object.hasOwn(manifest, "estimated_cost")) throw new Error("PROVIDER_ESTIMATED_COST_REQUIRED");
  const estimatedCost = manifest.estimated_cost;
  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) throw new Error("PROVIDER_ESTIMATED_COST_INVALID");
  const recommendationRank = manifest.recommendation_rank ?? null;
  if (recommendationRank !== null && (!Number.isSafeInteger(recommendationRank) || recommendationRank <= 0)) throw new Error("PROVIDER_RECOMMENDATION_RANK_INVALID");
  return {
    manifest_id: requireString(manifest.manifest_id, "PROVIDER_MANIFEST_ID_REQUIRED"),
    version: requireString(manifest.version, "PROVIDER_MANIFEST_VERSION_REQUIRED"),
    identity,
    identity_key: providerIdentityKey(identity),
    capabilities: [...new Set(manifest.capabilities)].sort(),
    native_reasoning_values: nativeValues,
    effort_mapping: { ...manifest.effort_mapping },
    certification_profile: structuredClone(certificationProfile),
    resource_bounds: { ...resourceBounds },
    transport_descriptor: structuredClone(manifest.transport_descriptor ?? {}),
    reasoning_mapping_provenance: structuredClone(mappingProvenance),
    selection_profile: { correctness: selectionProfile.correctness, safety: selectionProfile.safety, efficiency: selectionProfile.efficiency, roles: [...new Set(selectionProfile.roles)].sort() },
    custom: manifest.custom === true,
    requires_observation: manifest.custom === true || manifest.requires_observation === true,
    priority: manifest.priority ?? 100,
    estimated_cost: estimatedCost,
    recommendation_rank: recommendationRank
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
  for (const [field, code] of [["manifest_fingerprint", "CERTIFICATION_MANIFEST_FINGERPRINT_INVALID"], ["capability_fingerprint", "CERTIFICATION_CAPABILITY_FINGERPRINT_INVALID"], ["observation_fingerprint", "CERTIFICATION_OBSERVATION_FINGERPRINT_INVALID"], ["probe_fingerprint", "CERTIFICATION_PROBE_FINGERPRINT_INVALID"], ["clock_fingerprint", "CERTIFICATION_CLOCK_FINGERPRINT_INVALID"], ["authority_fingerprint", "CERTIFICATION_AUTHORITY_FINGERPRINT_INVALID"], ["drift_fingerprint", "CERTIFICATION_DRIFT_FINGERPRINT_INVALID"]]) {
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
    manifest_fingerprint: certification.manifest_fingerprint,
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
  const expectedDrift = digest({ identity_key: normalized.identity_key, manifest_version: normalized.manifest_version, adapter_version: normalized.adapter_version, platform: normalized.platform, manifest_fingerprint: normalized.manifest_fingerprint, capability_fingerprint: normalized.capability_fingerprint, observation_fingerprint: normalized.observation_fingerprint, revocation_epoch: normalized.revocation_epoch });
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
      if (certification.manifest_fingerprint !== digest(manifest)) reasons.push("MANIFEST_CONTENT_DRIFT");
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
  const modelPolicy = Object.hasOwn(requirements, "model_policy") ? requirements.model_policy : {};
  const modelId = entry.manifest.identity.model_id;
  const publisherId = entry.manifest.identity.model_publisher_id;
  const modelPolicyFields = ["allowed_model_ids", "denied_model_ids", "allowed_model_publishers", "denied_model_publishers", "denied_model_prefixes"];
  const modelPolicyInvalid = !modelPolicy || typeof modelPolicy !== "object" || Array.isArray(modelPolicy)
    || Object.keys(modelPolicy).some((field) => !modelPolicyFields.includes(field))
    || modelPolicyFields.some((field) => modelPolicy[field] !== undefined && (!Array.isArray(modelPolicy[field]) || modelPolicy[field].some((value) => typeof value !== "string" || value.length === 0)));
  if (modelPolicyInvalid) blockers.push("MODEL_POLICY_INVALID");
  else {
    for (const [field, code] of [["allowed_model_ids", "MODEL_NOT_ALLOWLISTED"], ["allowed_model_publishers", "MODEL_PUBLISHER_NOT_ALLOWLISTED"]]) {
      const values = modelPolicy[field];
      if (Array.isArray(values) && values.length > 0 && !values.includes(field === "allowed_model_ids" ? modelId : publisherId)) blockers.push(code);
    }
    if (modelPolicy.denied_model_ids?.includes(modelId)) blockers.push("MODEL_DENIED");
    if (modelPolicy.denied_model_publishers?.includes(publisherId)) blockers.push("MODEL_PUBLISHER_DENIED");
    if (modelPolicy.denied_model_prefixes?.some((prefix) => modelId.startsWith(prefix))) blockers.push("MODEL_PREFIX_DENIED");
  }
  if (authority?.decision !== "ALLOW") blockers.push("AUTHORITY_DENIED");
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) blockers.push("BUDGET_INPUT_INVALID");
  else {
    for (const [key, bound] of Object.entries(entry.manifest.resource_bounds)) {
      if (!Object.hasOwn(budget, key)) blockers.push(`BUDGET_BOUND_REQUIRED:${key}`);
      else if (!Number.isFinite(budget[key]) || budget[key] < 0) blockers.push(`BUDGET_INPUT_INVALID:${key}`);
      else if (bound > budget[key]) blockers.push(`BUDGET_EXCEEDED:${key}`);
    }
    for (const [key, value] of Object.entries(budget)) {
      if (!Number.isFinite(value) || value < 0) blockers.push(`BUDGET_INPUT_INVALID:${key}`);
      else if (!Object.hasOwn(entry.manifest.resource_bounds, key)) blockers.push(`RESOURCE_BOUND_MISSING:${key}`);
    }
    if (entry.manifest.estimated_cost > 0 && !Object.hasOwn(budget, "cost")) blockers.push("BUDGET_COST_REQUIRED");
    if (Object.hasOwn(budget, "cost") && entry.manifest.estimated_cost > budget.cost) blockers.push("BUDGET_ESTIMATED_COST_EXCEEDED");
  }
  return [...new Set(blockers)].sort();
}

const MODEL_POLICY_FIELDS = Object.freeze(["allowed_model_ids", "denied_model_ids", "allowed_model_publishers", "denied_model_publishers", "denied_model_prefixes"]);

function normalizeModelPolicySource(container) {
  if (!Object.hasOwn(container, "model_policy")) return { present: false, valid: true, value: {} };
  const value = container.model_policy;
  const valid = value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((field) => MODEL_POLICY_FIELDS.includes(field))
    && MODEL_POLICY_FIELDS.every((field) => value[field] === undefined || (Array.isArray(value[field]) && value[field].every((item) => typeof item === "string" && item.length > 0)));
  return { present: true, valid, value: valid ? value : null };
}

function composeModelPolicy(ownerContainer, taskContainer) {
  const owner = normalizeModelPolicySource(ownerContainer);
  const task = normalizeModelPolicySource(taskContainer);
  if (!owner.valid || !task.valid) return null;
  const result = {};
  for (const field of ["allowed_model_ids", "allowed_model_publishers"]) {
    const left = [...new Set(owner.value[field] ?? [])];
    const right = [...new Set(task.value[field] ?? [])];
    let values = left.length > 0 && right.length > 0 ? left.filter((item) => right.includes(item)) : left.length > 0 ? left : right;
    if (left.length > 0 && right.length > 0 && values.length === 0) values = [`urn:next-workflow:no-${field}-matches`];
    if (values.length > 0 || (left.length > 0 && right.length > 0)) result[field] = values.sort();
  }
  for (const field of ["denied_model_ids", "denied_model_publishers", "denied_model_prefixes"]) {
    const values = [...new Set([...(owner.value[field] ?? []), ...(task.value[field] ?? [])])].sort();
    if (values.length > 0) result[field] = values;
  }
  return result;
}

const NORMALIZED_EFFORT_ORDER = Object.freeze(["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
const NORMALIZED_EFFORT_RANK = Object.freeze({
  none: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  balanced: 3,
  high: 4,
  enhanced: 4,
  xhigh: 5,
  max: 6,
});
const RIGOR_EFFORT_FLOOR = Object.freeze({ L1: "minimal", L2: "low", L3: "medium", L4: "high", L5: "xhigh" });

function automaticEffortFloor(requirements, authority) {
  const rigor = requirements.rigor ?? authority?.rigor ?? "L3";
  if (!Object.hasOwn(RIGOR_EFFORT_FLOOR, rigor)) throw new Error("SELECTION_RIGOR_INVALID");
  let rank = NORMALIZED_EFFORT_RANK[RIGOR_EFFORT_FLOOR[rigor]];
  const risk = requirements.risk ?? "normal";
  const complexity = requirements.complexity ?? "normal";
  if (!new Set(["low", "normal", "high", "critical"]).has(risk) || !new Set(["low", "normal", "high", "extreme"]).has(complexity)) throw new Error("SELECTION_RISK_OR_COMPLEXITY_INVALID");
  if (risk === "high") rank += 1;
  if (risk === "critical") rank += 2;
  if (complexity === "high") rank += 1;
  if (complexity === "extreme") rank += 2;
  return { rigor, risk, complexity, normalized_floor: NORMALIZED_EFFORT_ORDER[Math.min(rank, NORMALIZED_EFFORT_ORDER.length - 1)] };
}

function selectManifestEffort(manifest, { requirements, authority, requestedNativeReasoning }) {
  const criteria = automaticEffortFloor(requirements, authority);
  const floorRank = NORMALIZED_EFFORT_ORDER.indexOf(criteria.normalized_floor);
  const explicitNative = requirements.native_reasoning ?? requestedNativeReasoning ?? null;
  const explicitNormalized = requirements.normalized_effort ?? null;
  if (explicitNormalized !== null && !Object.hasOwn(NORMALIZED_EFFORT_RANK, explicitNormalized)) return { blockers: ["NORMALIZED_EFFORT_UNKNOWN"], criteria };
  const candidates = manifest.native_reasoning_values.map((nativeReasoning) => ({ native_reasoning: nativeReasoning, normalized_effort: manifest.effort_mapping[nativeReasoning] })).filter((candidate) => typeof candidate.normalized_effort === "string" && Object.hasOwn(NORMALIZED_EFFORT_RANK, candidate.normalized_effort));
  let filtered = candidates;
  if (explicitNative !== null) filtered = filtered.filter((candidate) => candidate.native_reasoning === explicitNative);
  if (explicitNormalized !== null) filtered = filtered.filter((candidate) => candidate.normalized_effort === explicitNormalized);
  filtered = filtered.filter((candidate) => NORMALIZED_EFFORT_RANK[candidate.normalized_effort] >= floorRank);
  filtered.sort((left, right) => NORMALIZED_EFFORT_RANK[left.normalized_effort] - NORMALIZED_EFFORT_RANK[right.normalized_effort] || left.native_reasoning.localeCompare(right.native_reasoning));
  const selected = filtered[0];
  const blockers = [];
  if (explicitNative !== null && !manifest.native_reasoning_values.includes(explicitNative)) blockers.push("NATIVE_REASONING_UNSUPPORTED");
  if (explicitNormalized !== null && !Object.values(manifest.effort_mapping).includes(explicitNormalized)) blockers.push("NORMALIZED_EFFORT_UNSUPPORTED");
  if (!selected && blockers.length === 0) blockers.push("EFFORT_BELOW_REQUIRED_FLOOR");
  return { ...selected, blockers, criteria, requested_native_reasoning: explicitNative, requested_normalized_effort: explicitNormalized };
}

export function selectAgentConfiguration({ registry, policy, inheritanceChain = [], requirements = {}, authority, budget = {} }) {
  if (!registry?.entries || !policy || !new Set(["auto", "manual", "inherit"]).has(policy.mode)) throw new Error("SELECTION_INPUT_INVALID");
  let requested;
  let requestedNativeReasoning = policy.native_reasoning ?? null;
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
      requestedNativeReasoning = entry.native_reasoning ?? requestedNativeReasoning;
      break;
    }
    if (!requested) return { decision: "STOP", code: "NO_INHERITED_SELECTION", inheritance_trace: trace };
  }
  const effectiveRequirements = { ...requirements, model_policy: composeModelPolicy(policy, requirements) };
  const objective = developmentObjective(effectiveRequirements);
  let evaluated = registry.entries.map((entry) => {
    const effort = selectManifestEffort(entry.manifest, { requirements: effectiveRequirements, authority, requestedNativeReasoning });
    return { entry, effort, blockers: [...new Set([...eligibility(entry, effectiveRequirements, authority, budget), ...effort.blockers])].sort() };
  });
  if (policy.mode === "auto") {
    const catalogRanks = evaluated.map((item) => item.entry.manifest.recommendation_rank).filter((rank) => Number.isSafeInteger(rank));
    if (catalogRanks.length > 0) {
      const maximumRecommendedRank = Math.min(...catalogRanks) + DEVELOPMENT_RECOMMENDATION_RANK_SPAN;
      evaluated = evaluated.map((item) => item.entry.manifest.recommendation_rank > maximumRecommendedRank
        ? { ...item, blockers: [...new Set([...item.blockers, "OUTSIDE_RECOMMENDED_COHORT"])].sort() }
        : item);
    }
  }
  const role = effectiveRequirements.role ?? null;
  const eligibleRanks = evaluated.filter((item) => item.blockers.length === 0).map((item) => item.entry.manifest.recommendation_rank).filter((rank) => Number.isSafeInteger(rank)).sort((left, right) => left - right);
  const medianRank = eligibleRanks.length > 0 ? eligibleRanks[Math.floor((eligibleRanks.length - 1) / 2)] : null;
  const ranked = [...evaluated].sort((a, b) => {
    const aRole = role !== null && a.entry.manifest.selection_profile.roles.includes(role) ? 1 : 0;
    const bRole = role !== null && b.entry.manifest.selection_profile.roles.includes(role) ? 1 : 0;
    const commonTail = () => a.entry.manifest.priority - b.entry.manifest.priority
      || a.entry.manifest.estimated_cost - b.entry.manifest.estimated_cost
      || a.entry.manifest.identity_key.localeCompare(b.entry.manifest.identity_key);
    if (objective === "efficiency") {
      return b.entry.manifest.selection_profile.efficiency - a.entry.manifest.selection_profile.efficiency
        || bRole - aRole
        || b.entry.manifest.selection_profile.correctness - a.entry.manifest.selection_profile.correctness
        || b.entry.manifest.selection_profile.safety - a.entry.manifest.selection_profile.safety
        || commonTail();
    }
    if (objective === "balanced" && medianRank !== null) {
      const aDistance = Number.isSafeInteger(a.entry.manifest.recommendation_rank) ? Math.abs(a.entry.manifest.recommendation_rank - medianRank) : Number.MAX_SAFE_INTEGER;
      const bDistance = Number.isSafeInteger(b.entry.manifest.recommendation_rank) ? Math.abs(b.entry.manifest.recommendation_rank - medianRank) : Number.MAX_SAFE_INTEGER;
      return aDistance - bDistance
        || bRole - aRole
        || (b.entry.manifest.selection_profile.correctness + b.entry.manifest.selection_profile.safety + b.entry.manifest.selection_profile.efficiency)
          - (a.entry.manifest.selection_profile.correctness + a.entry.manifest.selection_profile.safety + a.entry.manifest.selection_profile.efficiency)
        || commonTail();
    }
    return b.entry.manifest.selection_profile.correctness - a.entry.manifest.selection_profile.correctness
      || b.entry.manifest.selection_profile.safety - a.entry.manifest.selection_profile.safety
      || bRole - aRole
      || b.entry.manifest.selection_profile.efficiency - a.entry.manifest.selection_profile.efficiency
      || commonTail();
  });
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
  const result = { decision: "PASS", mode: policy.mode, objective, requested: requested ?? "auto", selected: selected.entry.manifest.identity_key, effective: selected.entry.manifest.identity_key, selected_model: selected.entry.manifest.identity.model_id, selected_native_reasoning: selected.effort.native_reasoning, selected_normalized_effort: selected.effort.normalized_effort, effort_criteria: selected.effort.criteria, previous_effective: policy.previous_effective ?? null, reselection_reason: policy.reselection_reason ?? null, fallback_count: policy.mode === "auto" ? selectedRank - 1 : 0, selection_lineage: selectionLineage, manifest: selected.entry.manifest, inheritance_trace: trace, actual_observed: null };
  return { ...result, fingerprint: digest(result) };
}

const DEVELOPMENT_OBJECTIVES = new Set(["auto", "correctness", "balanced", "efficiency"]);
const DEVELOPMENT_RISK = new Set(["low", "normal", "high", "critical"]);
const DEVELOPMENT_COMPLEXITY = new Set(["low", "normal", "high", "extreme"]);
const DEVELOPMENT_RECOMMENDATION_RANK_SPAN = 2;

function developmentStop(code, details = {}) {
  const result = {
    schema_version: "1.0.0",
    decision: "STOP",
    profile: "development_advisory",
    code,
    ...details,
    production_eligible: false,
    selection_grants_launch_authority: false,
    backend_attestation: false,
  };
  return { ...result, fingerprint: digest(result) };
}

function developmentObjective(requirements) {
  const requested = requirements.objective ?? "auto";
  if (!DEVELOPMENT_OBJECTIVES.has(requested)) throw new Error("DEVELOPMENT_SELECTION_OBJECTIVE_INVALID");
  const rigor = requirements.rigor ?? "L3";
  const risk = requirements.risk ?? "normal";
  const complexity = requirements.complexity ?? "normal";
  if (!Object.hasOwn(RIGOR_EFFORT_FLOOR, rigor)) throw new Error("SELECTION_RIGOR_INVALID");
  if (!DEVELOPMENT_RISK.has(risk) || !DEVELOPMENT_COMPLEXITY.has(complexity)) throw new Error("SELECTION_RISK_OR_COMPLEXITY_INVALID");
  if (requested !== "auto") return requested;
  if (["L4", "L5"].includes(rigor) || ["high", "critical"].includes(risk) || ["high", "extreme"].includes(complexity)) return "correctness";
  if (["L1", "L2"].includes(rigor) && risk === "low" && ["low", "normal"].includes(complexity)) return "efficiency";
  return "balanced";
}

function normalizedDevelopmentEffort(nativeReasoning) {
  if (Object.hasOwn(NORMALIZED_EFFORT_RANK, nativeReasoning)) return nativeReasoning;
  if (nativeReasoning === "ultra") return "max";
  return null;
}

function validateDevelopmentCatalogSet(catalogSet, now) {
  if (!catalogSet || catalogSet.catalog_kind !== "development_advisory_set" || catalogSet.schema_version !== "1.0.0") return "DEVELOPMENT_CATALOG_SET_INVALID";
  if (!/^[a-f0-9]{64}$/.test(catalogSet.fingerprint ?? "") || digest(Object.fromEntries(Object.entries(catalogSet).filter(([key]) => key !== "fingerprint"))) !== catalogSet.fingerprint) return "DEVELOPMENT_CATALOG_SET_FINGERPRINT_INVALID";
  if (!Array.isArray(catalogSet.catalogs) || catalogSet.catalogs.length === 0 || catalogSet.catalogs.length > 32) return "DEVELOPMENT_CATALOG_SET_EMPTY";
  const nowTimestamp = Date.parse(now);
  if (!Number.isFinite(nowTimestamp) || !Number.isFinite(Date.parse(catalogSet.observed_at)) || !Number.isFinite(Date.parse(catalogSet.fresh_until)) || Date.parse(catalogSet.observed_at) > nowTimestamp || Date.parse(catalogSet.fresh_until) < nowTimestamp) return "DEVELOPMENT_CATALOG_SET_STALE";
  for (const catalog of catalogSet.catalogs) {
    if (!catalog || catalog.catalog_kind !== "development_advisory" || catalog.production_eligible !== false || catalog.selection_grants_launch_authority !== false) return "DEVELOPMENT_CATALOG_INVALID";
    if (!/^[a-f0-9]{64}$/.test(catalog.fingerprint ?? "") || digest(Object.fromEntries(Object.entries(catalog).filter(([key]) => key !== "fingerprint"))) !== catalog.fingerprint) return "DEVELOPMENT_CATALOG_FINGERPRINT_INVALID";
    if (!Number.isFinite(Date.parse(catalog.observed_at)) || !Number.isFinite(Date.parse(catalog.fresh_until)) || Date.parse(catalog.observed_at) > nowTimestamp || Date.parse(catalog.fresh_until) < nowTimestamp) return "DEVELOPMENT_CATALOG_STALE";
    if (!Array.isArray(catalog.models) || catalog.models.length === 0 || catalog.models.length > 256) return "DEVELOPMENT_MODEL_CATALOG_INVALID";
    if (!Array.isArray(catalog.capabilities) || !catalog.resource_bounds || typeof catalog.resource_bounds !== "object" || Array.isArray(catalog.resource_bounds) || !Number.isFinite(catalog.estimated_cost) || catalog.estimated_cost < 0) return "DEVELOPMENT_CATALOG_POLICY_INVALID";
    for (const field of ["execution_provider_id", "model_publisher_id", "adapter_id", "transport_id", "adapter_version"]) if (typeof catalog[field] !== "string" || catalog[field].length === 0) return "DEVELOPMENT_CATALOG_IDENTITY_INVALID";
    for (const model of catalog.models) {
      if (typeof model?.model_id !== "string" || model.model_id.length === 0 || !Number.isSafeInteger(model.recommendation_rank) || model.recommendation_rank <= 0 || !Array.isArray(model.native_reasoning_values) || model.native_reasoning_values.length === 0) return "DEVELOPMENT_MODEL_CATALOG_INVALID";
      if (model.native_reasoning_values.some((value) => typeof value !== "string" || normalizedDevelopmentEffort(value) === null)) return "DEVELOPMENT_MODEL_EFFORT_UNSUPPORTED";
    }
  }
  return null;
}

function developmentOrdering(models, objective) {
  const ranks = [...new Set(models.map((item) => item.recommendation_rank))].sort((left, right) => left - right);
  const medianRank = ranks[Math.floor((ranks.length - 1) / 2)];
  return [...models].sort((left, right) => {
    if (objective === "efficiency") return right.recommendation_rank - left.recommendation_rank || left.identity_key.localeCompare(right.identity_key);
    if (objective === "balanced") return Math.abs(left.recommendation_rank - medianRank) - Math.abs(right.recommendation_rank - medianRank) || left.recommendation_rank - right.recommendation_rank || left.identity_key.localeCompare(right.identity_key);
    return left.recommendation_rank - right.recommendation_rank || left.identity_key.localeCompare(right.identity_key);
  });
}

export function selectDevelopmentAgentConfiguration({ catalogSet, policy, requirements = {}, budget = { cost: 0 }, now = new Date().toISOString() }) {
  const catalogError = validateDevelopmentCatalogSet(catalogSet, now);
  if (catalogError) return developmentStop(catalogError);
  if (!policy || !new Set(["auto", "manual"]).has(policy.mode)) return developmentStop("DEVELOPMENT_SELECTION_POLICY_INVALID");
  let objective;
  try {
    objective = developmentObjective(requirements);
  } catch (error) {
    return developmentStop(error?.message ?? "DEVELOPMENT_SELECTION_REQUIREMENTS_INVALID");
  }
  const models = [];
  const identityKeys = new Set();
  for (const catalog of catalogSet.catalogs) {
    for (const model of catalog.models) {
      const identity = {
        execution_provider_id: catalog.execution_provider_id,
        model_publisher_id: catalog.model_publisher_id,
        agent_product_id: catalog.agent_product_id ?? null,
        adapter_id: catalog.adapter_id,
        transport_id: catalog.transport_id,
        model_id: model.model_id,
      };
      let identityKey;
      try { identityKey = providerIdentityKey(identity); } catch { return developmentStop("DEVELOPMENT_CATALOG_IDENTITY_INVALID"); }
      if (identityKeys.has(identityKey)) return developmentStop("DEVELOPMENT_MODEL_IDENTITY_DUPLICATE");
      identityKeys.add(identityKey);
      models.push({ catalog, model, identity, identity_key: identityKey, recommendation_rank: model.recommendation_rank });
    }
  }
  const uniqueRanks = [...new Set(models.map((item) => item.recommendation_rank))].sort((left, right) => left - right);
  const maximumRecommendedRank = uniqueRanks[0] + DEVELOPMENT_RECOMMENDATION_RANK_SPAN;
  const recommended = models.filter((item) => item.recommendation_rank <= maximumRecommendedRank);
  const ordered = developmentOrdering(recommended, objective);
  const orderByIdentity = new Map(ordered.map((item, index) => [item.identity_key, index]));
  const advisoryRegistry = {
    schema_version: "1.0.0",
    observed_at: catalogSet.observed_at,
    fingerprint: catalogSet.fingerprint,
    entries: models.map((item) => {
      const outsideRecommendedCohort = policy.mode === "auto" && !orderByIdentity.has(item.identity_key);
      const order = orderByIdentity.get(item.identity_key) ?? recommended.length + item.recommendation_rank;
      const effortMapping = Object.fromEntries(item.model.native_reasoning_values.map((value) => [value, normalizedDevelopmentEffort(value)]));
      return {
        eligible: !outsideRecommendedCohort,
        blockers: outsideRecommendedCohort ? ["OUTSIDE_RECOMMENDED_COHORT"] : [],
        certification: null,
        observation: null,
        manifest: {
          manifest_id: `${item.catalog.catalog_id}:${item.model.model_id}`,
          version: `1.0.0+${item.catalog.adapter_version}`,
          identity: item.identity,
          identity_key: item.identity_key,
          capabilities: [...new Set(item.catalog.capabilities)].sort(),
          native_reasoning_values: [...item.model.native_reasoning_values],
          effort_mapping: effortMapping,
          selection_profile: {
            correctness: Math.max(0, 100 - Math.min(order, 100)),
            safety: Math.max(0, 100 - Math.min(order, 100)),
            efficiency: objective === "efficiency" ? Math.max(0, 100 - Math.min(order, 100)) : 50,
            roles: requirements.role ? [requirements.role] : [],
          },
          resource_bounds: { ...item.catalog.resource_bounds },
          estimated_cost: item.catalog.estimated_cost,
          priority: order + 1,
          development_catalog_fingerprint: item.catalog.fingerprint,
          recommendation_rank: item.recommendation_rank,
        },
      };
    }),
  };
  const selected = selectAgentConfiguration({
    registry: advisoryRegistry,
    policy,
    requirements: { ...requirements, objective: undefined },
    authority: { decision: "ALLOW", rigor: requirements.rigor ?? "L3" },
    budget,
  });
  if (selected.decision !== "PASS") return developmentStop(selected.code ?? "DEVELOPMENT_SELECTION_INELIGIBLE", {
    requested: selected.requested ?? policy.mode,
    blockers: selected.blockers ?? [],
    selection_lineage: selected.selection_lineage ?? [],
    catalog_set_fingerprint: catalogSet.fingerprint,
    policy_fingerprint: digest(policy),
  });
  const preparedConfiguration = {
    model_argument: ["--model", selected.selected_model],
    reasoning_argument: ["-c", `model_reasoning_effort=${JSON.stringify(selected.selected_native_reasoning)}`],
  };
  const result = {
    schema_version: "1.0.0",
    decision: "RECOMMEND",
    profile: "development_advisory",
    mode: selected.mode,
    requested: selected.requested,
    agent_id: requirements.agent_id ?? null,
    role: requirements.role ?? null,
    rigor: selected.effort_criteria.rigor,
    risk: selected.effort_criteria.risk,
    complexity: selected.effort_criteria.complexity,
    objective,
    selected_provider: selected.selected,
    selected_model: selected.selected_model,
    selected_native_reasoning: selected.selected_native_reasoning,
    selected_normalized_effort: selected.selected_normalized_effort,
    effort_criteria: selected.effort_criteria,
    catalog_set_fingerprint: catalogSet.fingerprint,
    policy_fingerprint: digest(policy),
    selection_lineage: selected.selection_lineage,
    prepared_configuration: preparedConfiguration,
    production_eligible: false,
    selection_grants_launch_authority: false,
    backend_attestation: false,
  };
  return { ...result, fingerprint: digest(result) };
}

export function verifyDevelopmentAgentConfiguration({ plan, preparedModel, preparedNativeReasoning }) {
  if (!plan || plan.decision !== "RECOMMEND" || plan.profile !== "development_advisory" || plan.production_eligible !== false || plan.selection_grants_launch_authority !== false || plan.backend_attestation !== false) return developmentStop("DEVELOPMENT_SELECTION_PLAN_INVALID");
  const expectedFingerprint = digest(Object.fromEntries(Object.entries(plan).filter(([key]) => key !== "fingerprint")));
  if (!/^[a-f0-9]{64}$/.test(plan.fingerprint ?? "") || expectedFingerprint !== plan.fingerprint) return developmentStop("DEVELOPMENT_SELECTION_PLAN_FINGERPRINT_INVALID");
  if (typeof preparedModel !== "string" || typeof preparedNativeReasoning !== "string") return developmentStop("PREPARED_CONFIGURATION_INVALID");
  const expectedModelArguments = ["--model", plan.selected_model];
  const expectedReasoningArguments = ["-c", `model_reasoning_effort=${JSON.stringify(plan.selected_native_reasoning)}`];
  const matches = preparedModel === plan.selected_model
    && preparedNativeReasoning === plan.selected_native_reasoning
    && canonicalJson(plan.prepared_configuration?.model_argument) === canonicalJson(expectedModelArguments)
    && canonicalJson(plan.prepared_configuration?.reasoning_argument) === canonicalJson(expectedReasoningArguments);
  if (!matches) return developmentStop("PREPARED_CONFIGURATION_MISMATCH", {
    plan_fingerprint: plan.fingerprint,
    prepared_model: preparedModel,
    prepared_native_reasoning: preparedNativeReasoning,
  });
  const result = {
    schema_version: "1.0.0",
    decision: "PASS",
    profile: "development_advisory",
    plan_fingerprint: plan.fingerprint,
    prepared_model: preparedModel,
    prepared_native_reasoning: preparedNativeReasoning,
    configuration_binding: "prepared_cli_arguments",
    production_eligible: false,
    selection_grants_launch_authority: false,
    backend_attestation: false,
  };
  return { ...result, fingerprint: digest(result) };
}

export function createSelectionDryRun({ change, baseRevision, before, after, affectedAgents, authorityDelta, capabilityDelta, costDelta, networkDelta, blockers = [], expiresAt }) {
  const result = { schema_version: "1.0.0", change, base_revision: baseRevision, before, after, affected_agents: [...affectedAgents].sort(), authority_delta: authorityDelta, capability_delta: capabilityDelta, cost_delta: costDelta, network_delta: networkDelta, blockers: [...blockers].sort(), expires_at: expiresAt, grants_authority: false };
  return { ...result, fingerprint: digest(result) };
}

export function createLaunchIntent({ grant, selection, effective, context, reservation, targets, authorityEpoch, intentId, createdAt, taskEnvelope = null }) {
  if (selection?.decision !== "PASS") throw new Error("SELECTION_NOT_ADMITTED");
  if (!Array.isArray(targets) || targets.length === 0 || targets.some((target) => typeof target !== "string" || target.length === 0)) throw new Error("LAUNCH_TARGETS_REQUIRED");
  const normalizedTargets = [...new Set(targets)].sort();
  if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("LAUNCH_AUTHORITY_EPOCH_REQUIRED");
  if (taskEnvelope !== null) {
    const required = ["invariant_fingerprint", "instruction_fingerprint", "envelope_fingerprint", "delivery_fingerprint"];
    if (required.some((field) => !/^[a-f0-9]{64}$/.test(taskEnvelope?.[field] ?? ""))) throw new Error("LAUNCH_TASK_ENVELOPE_BINDING_INVALID");
  }
  const selectedModel = requireString(selection.selected_model, "LAUNCH_SELECTED_MODEL_REQUIRED");
  const selectedNativeReasoning = requireString(selection.selected_native_reasoning, "LAUNCH_SELECTED_REASONING_REQUIRED");
  const selectedNormalizedEffort = requireString(selection.selected_normalized_effort, "LAUNCH_SELECTED_NORMALIZED_EFFORT_REQUIRED");
  const intent = { schema_version: "1.0.0", intent_id: requireString(intentId, "LAUNCH_INTENT_ID_REQUIRED"), grant_fingerprint: requireString(grant?.fingerprint, "GRANT_FINGERPRINT_REQUIRED"), requested: selection.requested, selected: selection.selected, effective: effective ?? selection.effective, selected_model: selectedModel, selected_native_reasoning: selectedNativeReasoning, selected_normalized_effort: selectedNormalizedEffort, actual_observed: null, context_fingerprint: requireString(context?.fingerprint, "CONTEXT_FINGERPRINT_REQUIRED"), reservation_id: requireString(reservation?.reservation_id, "RESERVATION_REQUIRED"), authority_epoch: authorityEpoch, targets: normalizedTargets, created_at: requireString(createdAt, "LAUNCH_TIME_REQUIRED"), ...(taskEnvelope ? { task_envelope: structuredClone(taskEnvelope) } : {}) };
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
  if (verifiedObserved.native_reasoning !== intent.selected_native_reasoning || verifiedObserved.normalized_effort !== intent.selected_normalized_effort) return { decision: "STOP", code: "ACTUAL_MODEL_OR_EFFORT_MISMATCH", expected: { model: intent.selected_model, native_reasoning: intent.selected_native_reasoning, normalized_effort: intent.selected_normalized_effort }, actual: { model: verifiedObserved.identity?.model_id ?? null, native_reasoning: verifiedObserved.native_reasoning ?? null, normalized_effort: verifiedObserved.normalized_effort ?? null } };
  const observationFingerprint = digest(verifiedObserved);
  if (!verifiedProof || verifiedProof.verified !== true || verifiedProof.independent !== true || verifiedProof.verified_by !== verifier.verifier_id || verifiedProof.fingerprint !== observationFingerprint || typeof verifiedProof.evidence_strength !== "string" || verifiedProof.evidence_strength.length === 0) return { decision: "STOP", code: "ACTUAL_OBSERVATION_PROOF_INVALID" };
  const proofFingerprint = digest({ verifier_id: verifier.verifier_id, observation_fingerprint: observationFingerprint, evidence_strength: verifiedProof.evidence_strength });
  const attestation = { schema_version: "1.0.0", requested: intent.requested, selected: intent.selected, effective: intent.effective, actual_observed: { ...verifiedObserved, targets: observedTargets, capabilities: [...new Set(verifiedObserved.capabilities)].sort(), fingerprint: observationFingerprint }, observed_at: requireString(admittedAt, "ADMISSION_TIME_REQUIRED"), evidence_strength: verifiedProof.evidence_strength, verifier_id: verifier.verifier_id, observation_proof_fingerprint: proofFingerprint };
  return { decision: "PASS", attestation: { ...attestation, fingerprint: digest(attestation) } };
}

function normalizeCliAttestationExpectation(value, manifest) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("CLI_ATTESTATION_EXPECTATION_INVALID");
  const normalizedManifest = normalizeManifest(manifest);
  const identity = providerIdentity(value.identity);
  if (providerIdentityKey(identity) !== normalizedManifest.identity_key) throw new Error("CLI_ATTESTATION_IDENTITY_MISMATCH");
  const targets = [...new Set(value.targets ?? [])].sort();
  const capabilities = [...new Set(value.capabilities ?? [])].sort();
  const actions = [...new Set(value.actions ?? [])].sort();
  const tools = [...new Set(value.tools ?? [])].sort();
  if (targets.length === 0 || targets.some((target) => typeof target !== "string" || target.length === 0 || target.includes("\0")) || [capabilities, actions, tools].some((items) => items.some((item) => typeof item !== "string" || item.length === 0))) throw new Error("CLI_ATTESTATION_BOUNDARY_INVALID");
  if (!value.sandbox || typeof value.sandbox !== "object" || Array.isArray(value.sandbox) || !new Set(["read_only", "workspace_write"]).has(value.sandbox.mode) || typeof value.sandbox.network !== "boolean" || !Array.isArray(value.sandbox.writable_paths)) throw new Error("CLI_ATTESTATION_SANDBOX_INVALID");
  if (typeof value.adapter_instance_id !== "string" || value.adapter_instance_id.length === 0 || typeof value.normalized_effort !== "string" || normalizedManifest.effort_mapping[value.native_reasoning] !== value.normalized_effort) throw new Error("CLI_ATTESTATION_CONFIGURATION_INVALID");
  const resourceLimits = structuredClone(value.resource_limits ?? { max_runtime_ms: 0, max_tokens: 0, max_cost: 0, max_retries: 0 });
  for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(resourceLimits[field]) || resourceLimits[field] < 0) throw new Error("CLI_ATTESTATION_RESOURCE_LIMIT_INVALID");
  return {
    identity,
    native_reasoning: value.native_reasoning,
    normalized_effort: value.normalized_effort,
    adapter_instance_id: value.adapter_instance_id,
    sandbox: {
      mode: value.sandbox.mode,
      network: value.sandbox.network,
      writable_paths: [...new Set(value.sandbox.writable_paths)].sort(),
    },
    capabilities,
    actions,
    tools,
    resource_limits: resourceLimits,
    targets,
  };
}

export function buildCliLaunchPlan({ manifest, promptFile, promptFingerprint = null, responseFile, modelId, nativeReasoning, sandbox, workingDirectory, attestationExpectation = null }) {
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
  if (promptFingerprint !== null && !/^[a-f0-9]{64}$/.test(promptFingerprint)) throw new Error("CLI_PROMPT_FINGERPRINT_INVALID");
  const core = { transport: "cli_process", executable, executable_descriptor: structuredClone(descriptor.executable), interpreter_descriptor: structuredClone(descriptor.interpreter ?? null), model_id: modelId, native_reasoning: nativeReasoning, sandbox, argv, working_directory: workingDirectory, stdin_file: promptFile, stdin_fingerprint: promptFingerprint, response_file: responseFile, shell: false, environment: {}, environment_allowlist: [...descriptor.environment_allowlist], execution_policy: structuredClone(descriptor.execution_policy ?? null), attestation_expectation: normalizeCliAttestationExpectation(attestationExpectation, normalized), implicit_network_authority: false, requires_executable_revalidation: true };
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
  if (authorityFence !== undefined && authorityFence !== null) {
    assertProtectedAuthorityFencedCliExecutor(executor);
    if (executor.authority_fence_enforced !== true) throw new Error("CLI_AUTHORITY_FENCE_ENFORCEMENT_UNAVAILABLE");
  }
  const rebuilt = buildCliLaunchPlan({ manifest, promptFile: plan?.stdin_file, promptFingerprint: plan?.stdin_fingerprint ?? null, responseFile: plan?.response_file, modelId: plan?.model_id, nativeReasoning: plan?.native_reasoning, sandbox: plan?.sandbox, workingDirectory: plan?.working_directory, attestationExpectation: plan?.attestation_expectation ?? null });
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
      stdin_fingerprint: plan.stdin_fingerprint,
      response_file: plan.response_file,
      environment,
      execution_policy: structuredClone(plan.execution_policy),
      authority_fence: authorityFence ?? null,
      selected_provider: manifest.identity_key,
      selected_model: plan.model_id,
      selected_effort: plan.native_reasoning,
      attestation_expectation: structuredClone(plan.attestation_expectation),
      shell: false,
      plan_fingerprint: admission.plan_fingerprint,
      manifest_fingerprint: digest(manifest),
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
        if (input.stdin_fingerprint !== null && input.stdin_fingerprint !== undefined && (!/^[a-f0-9]{64}$/.test(input.stdin_fingerprint) || digest(readPinnedFile(promptFd, promptStat.size)) !== input.stdin_fingerprint)) throw new Error("CLI_PROMPT_FINGERPRINT_MISMATCH");
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

export function createRunLifecycleCliExecutor({ lifecyclePort, observationBuilder } = {}) {
  if (!lifecyclePort || typeof lifecyclePort.start !== "function" || typeof lifecyclePort.collect_result !== "function" || (observationBuilder !== undefined && typeof observationBuilder !== "function")) throw new Error("RUN_LIFECYCLE_CLI_EXECUTOR_CONFIGURATION_INVALID");
  assertProtectedRunLifecyclePort(lifecyclePort);
  const executor = Object.freeze({
    descriptor_pinned: true,
    authority_fence_enforced: true,
    async execute(input) {
      if (!input || input.shell !== false || !input.authority_fence || typeof input.authority_fence.guard !== "function" || !Number.isSafeInteger(input.authority_fence.authority_epoch) || typeof input.authority_fence.fencing_token !== "string" || typeof input.authority_fence.effect_id !== "string" || typeof input.authority_fence.effect_key !== "string" || !/^[a-f0-9]{64}$/.test(input.stdin_fingerprint ?? "") || !/^[a-f0-9]{64}$/.test(input.manifest_fingerprint ?? "") || typeof input.selected_provider !== "string" || typeof input.selected_model !== "string" || typeof input.selected_effort !== "string") throw new Error("RUN_LIFECYCLE_CLI_EXECUTOR_INPUT_INVALID");
      const guarded = await input.authority_fence.guard({ authority_epoch: input.authority_fence.authority_epoch, fencing_token: input.authority_fence.fencing_token, effect_id: input.authority_fence.effect_id, effect_key: input.authority_fence.effect_key });
      if (guarded?.current !== true || guarded.authority_epoch !== input.authority_fence.authority_epoch || guarded.fencing_token !== input.authority_fence.fencing_token) throw new Error("RUN_LIFECYCLE_CLI_AUTHORITY_FENCE_DENIED");
      const policy = input.execution_policy;
      if (!policy || !Number.isSafeInteger(policy.timeout_ms) || policy.timeout_ms < 1 || !Number.isSafeInteger(policy.max_response_bytes) || policy.max_response_bytes < 1 || !Number.isSafeInteger(policy.max_stderr_bytes) || policy.max_stderr_bytes < 1 || !Number.isSafeInteger(policy.max_prompt_bytes) || policy.max_prompt_bytes < 1) throw new Error("RUN_LIFECYCLE_CLI_EXECUTOR_BOUNDS_REQUIRED");
      const started = await lifecyclePort.start({
        run_id: input.authority_fence.effect_id,
        idempotency_key: input.authority_fence.effect_key,
        plan_fingerprint: input.plan_fingerprint,
        manifest_fingerprint: input.manifest_fingerprint,
        authority_epoch: input.authority_fence.authority_epoch,
        fence_fingerprint: digest(input.authority_fence.fencing_token),
        executable_path: input.executable_identity.path,
        executable_fingerprint: input.executable_identity.digest,
        ...(input.interpreter_identity ? { interpreter_path: input.interpreter_identity.path, interpreter_fingerprint: input.interpreter_identity.digest } : {}),
        argv: [...input.argv],
        working_directory: input.working_directory,
        stdin_file: input.stdin_file,
        stdin_fingerprint: input.stdin_fingerprint,
        response_file: input.response_file,
        environment: { ...input.environment },
        timeout_ms: policy.timeout_ms,
        max_result_bytes: policy.max_response_bytes,
        max_stderr_bytes: policy.max_stderr_bytes,
        selected_provider: input.selected_provider,
        selected_model: input.selected_model,
        selected_effort: input.selected_effort,
        attestation_expectation: structuredClone(input.attestation_expectation),
      }, {
        releaseGuard: () => input.authority_fence.guard({
          authority_epoch: input.authority_fence.authority_epoch,
          fencing_token: input.authority_fence.fencing_token,
          effect_id: input.authority_fence.effect_id,
          effect_key: input.authority_fence.effect_key,
        }),
      });
      const collected = await lifecyclePort.collect_result(started.run_id);
      if (collected.state !== "COMPLETED" || collected.exit_code !== 0 || !collected.launch_report || !collected.result_fingerprint) throw new Error("RUN_LIFECYCLE_CLI_EXECUTION_INCOMPLETE");
      const attestation = observationBuilder ? await observationBuilder({ input: structuredClone({ ...input, authority_fence: { ...input.authority_fence, guard: undefined } }), started: structuredClone(started), collected: structuredClone(collected) }) : null;
      if (attestation !== null) assertNoSecretMaterial(attestation, "RUN_LIFECYCLE_ATTESTATION_SECRET_FORBIDDEN");
      return {
        descriptor_pinned: true,
        plan_fingerprint: input.plan_fingerprint,
        exit_code: collected.exit_code,
        signal: collected.signal,
        executable_fingerprint: input.executable_identity.digest,
        interpreter_fingerprint: input.interpreter_identity?.digest ?? null,
        response_fingerprint: collected.result_fingerprint,
        result_fingerprint: collected.result_fingerprint,
        response_size: Buffer.byteLength(canonicalJson(collected.result)),
        stderr: "",
        fencing_enforced: true,
        authority_epoch: input.authority_fence.authority_epoch,
        fence_fingerprint: digest(input.authority_fence.fencing_token),
        lifecycle_run_id: started.run_id,
        lifecycle_process_identity_fingerprint: started.process_identity_fingerprint,
        launch_report: structuredClone(collected.launch_report),
        agent_result: structuredClone(collected.result),
        ...(attestation ?? {}),
      };
    },
  });
  AUTHORITY_FENCED_CLI_EXECUTORS.add(executor);
  return executor;
}

export function createObservedAuthorityFencedCliExecutor({ executor, onResult } = {}) {
  assertProtectedAuthorityFencedCliExecutor(executor);
  if (typeof onResult !== "function") throw new Error("CLI_EXECUTOR_RESULT_OBSERVER_REQUIRED");
  const observed = Object.freeze({
    descriptor_pinned: true,
    authority_fence_enforced: true,
    async execute(input) {
      const result = await executor.execute(input);
      onResult(structuredClone(result), structuredClone({ effect_id: input.authority_fence?.effect_id, effect_key: input.authority_fence?.effect_key }));
      return result;
    },
  });
  AUTHORITY_FENCED_CLI_EXECUTORS.add(observed);
  return observed;
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

export function providerManifestFingerprint(manifest) {
  return digest(normalizeManifest(manifest));
}
