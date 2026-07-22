import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  constants as fsConstants,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";
import { assertNoSecretMaterial } from "./secret_policy.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = [
  { version: 1, name: "initial", path: join(MODULE_DIR, "migrations", "001_initial.sql") },
  { version: 2, name: "saga-replay-and-intent-time", path: join(MODULE_DIR, "migrations", "002_saga_replay.sql") }
];
const STORE_SCHEMA_VERSION = MIGRATIONS.at(-1).version;
const OPEN_DATABASE_COUNTS = new Map();
const INTENT_TRANSITIONS = new Map([
  ["PREPARED", new Set(["DISPATCHING", "UNKNOWN", "MANUAL_RECOVERY_REQUIRED"])],
  ["DISPATCHING", new Set(["OBSERVED", "UNKNOWN", "CONFLICT", "MANUAL_RECOVERY_REQUIRED"])],
  ["UNKNOWN", new Set(["OBSERVED", "CONFLICT", "MANUAL_RECOVERY_REQUIRED"])],
  ["CONFLICT", new Set(["OBSERVED", "MANUAL_RECOVERY_REQUIRED"])],
  ["OBSERVED", new Set(["RECONCILED", "CONFLICT", "MANUAL_RECOVERY_REQUIRED"])],
  ["MANUAL_RECOVERY_REQUIRED", new Set(["OBSERVED", "CONFLICT"])],
  ["RECONCILED", new Set()]
]);
const OUTBOX_TRANSITIONS = new Map([
  ["pending", new Set(["sending", "quarantined"])],
  ["sending", new Set(["quarantined"])],
  ["delivered", new Set()],
  ["quarantined", new Set()]
]);
const RELATIONSHIP_TRANSITIONS = new Map([
  ["ACTIVE", new Set(["DRAINING", "REVOKED", "DETACHED"])],
  ["DRAINING", new Set(["ARCHIVED", "REVOKED"])],
  ["DETACHED", new Set(["ACTIVE", "ARCHIVED"])],
  ["ARCHIVED", new Set()],
  ["REVOKED", new Set()]
]);
const ACTIVATION_TRANSITIONS = new Map([
  ["planned", new Set(["shadow"])],
  ["shadow", new Set(["release_verified"])],
  ["release_verified", new Set(["recovery_verified"])],
  ["recovery_verified", new Set(["rollback_verified"])],
  ["rollback_verified", new Set(["archive_decommission_verified"])],
  ["archive_decommission_verified", new Set(["ready"])],
  ["ready", new Set(["enforced"])],
  ["enforced", new Set(["rolled_back"])],
  ["rolled_back", new Set()]
]);
const SAGA_DRAINING_MESSAGE_TYPES = new Set(["observation", "reconciliation", "existing_intent_delivery"]);
const AGENT_AUTHORITY_RECORD_KINDS = new Set([
  "DelegationGrant",
  "AgentReviewerAssignment",
  "AgentLeadReview",
  "AgentOrchestratorReview",
  "AgentValidatorDisposition",
  "ValidatorDecision",
  "ResourceCostReservation"
]);
const MIGRATION_LEDGER_SQL = "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, checksum TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','applied','failed')), started_at TEXT NOT NULL, applied_at TEXT) STRICT";
let EXPECTED_SQLITE_SCHEMA_FINGERPRINT;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function effectReceiptBindingFingerprint(intent, receipt) {
  return digest({
    effect_key: intent.effect_key,
    request_fingerprint: intent.request_fp,
    authority_decision_id: intent.authority_fp,
    target_id: intent.target_id,
    operation: intent.operation,
    expected_selector: JSON.parse(intent.expected_selector_json),
    observed_object: receipt.object_identity,
    observation_fingerprint: receipt.observation_fp
  });
}

function assertPlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
}

function assertNoRawSecrets(value) {
  assertNoSecretMaterial(value, "RAW_SECRET_FIELD_FORBIDDEN", { allowedKeyNames: new Set(["token_hash"]) });
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function assertNoExistingSymlink(root, candidate) {
  let cursor = candidate;
  const parts = [];
  while (isWithin(root, cursor) && cursor !== root) {
    parts.push(cursor);
    cursor = dirname(cursor);
  }
  parts.push(root);
  for (const part of parts.reverse()) {
    if (existsSync(part) && lstatSync(part).isSymbolicLink()) throw new Error("SYMLINK_DATABASE_PATH");
  }
}

function resolveSafePath(repositoryRoot, target, { allowOutsideStateDirectory = false } = {}) {
  const root = realpathSync(repositoryRoot);
  const candidate = resolve(target);
  if (!isWithin(root, candidate)) throw new Error("UNSAFE_DATABASE_PATH");
  if (!allowOutsideStateDirectory) {
    const stateRoot = join(root, ".workflow-state");
    if (!isWithin(stateRoot, candidate)) throw new Error("UNSAFE_DATABASE_PATH");
  }
  assertNoExistingSymlink(root, candidate);
  return { root, candidate };
}

function getMeta(db, key) {
  const row = db.prepare("SELECT value_json FROM store_meta WHERE key = ?").get(key);
  return row ? JSON.parse(row.value_json) : undefined;
}

function setMeta(db, key, value) {
  db.prepare("INSERT INTO store_meta(key,value_json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json").run(key, canonicalJson(value));
}

function normalizeIdentity(identity) {
  assertPlainObject(identity, "STORE_IDENTITY_REQUIRED");
  for (const field of ["repository_logical_id", "checkout_instance_id"]) {
    if (typeof identity[field] !== "string" || identity[field].length === 0) throw new Error(`STORE_IDENTITY_FIELD_REQUIRED:${field}`);
  }
  return {
    repository_logical_id: identity.repository_logical_id,
    checkout_instance_id: identity.checkout_instance_id,
    parent_instance_id: identity.parent_instance_id ?? null,
    relationship_id: identity.relationship_id ?? null
  };
}

function migrationIdentity() {
  return MIGRATIONS.map((migration) => ({ version: migration.version, name: migration.name, checksum: digest(readFileSync(migration.path, "utf8")) }));
}

function sqliteSchemaFingerprint(db) {
  return digest(db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name,tbl_name,sql").all());
}

function expectedSqliteSchemaFingerprint() {
  if (EXPECTED_SQLITE_SCHEMA_FINGERPRINT) return EXPECTED_SQLITE_SCHEMA_FINGERPRINT;
  const expected = new DatabaseSync(":memory:", { allowExtension: false });
  try {
    expected.exec(MIGRATION_LEDGER_SQL);
    for (const migration of MIGRATIONS) expected.exec(readFileSync(migration.path, "utf8"));
    EXPECTED_SQLITE_SCHEMA_FINGERPRINT = sqliteSchemaFingerprint(expected);
    return EXPECTED_SQLITE_SCHEMA_FINGERPRINT;
  } finally {
    expected.close();
  }
}

function createPreMigrationBackup(db, candidate, fromVersion, clock) {
  db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
  const backup = `${candidate}.pre-migration-v${fromVersion}.sqlite`;
  const manifestPath = `${backup}.manifest.json`;
  if (existsSync(backup) || existsSync(manifestPath)) throw new Error("MIGRATION_BACKUP_DESTINATION_EXISTS");
  copyFileSync(candidate, backup, fsConstants.COPYFILE_EXCL);
  const manifest = {
    format: "workflow-state-pre-migration-backup-v1",
    database_digest: digest(readFileSync(backup)),
    from_schema_version: fromVersion,
    to_schema_version: STORE_SCHEMA_VERSION,
    created_at: clock()
  };
  writeExclusiveFile(manifestPath, `${canonicalJson(manifest)}\n`, { replace: false });
  fsyncDirectory(dirname(candidate));
  return { backup, manifest_path: manifestPath };
}

function applyMigrations(db, candidate, clock) {
  db.exec(MIGRATION_LEDGER_SQL);
  const identities = migrationIdentity();
  const rows = db.prepare("SELECT version,name,checksum,state FROM schema_migrations ORDER BY version").all();
  for (const row of rows) {
    const expected = identities.find((item) => item.version === Number(row.version));
    if (!expected || row.name !== expected.name || row.checksum !== expected.checksum) throw new Error("MIGRATION_CHECKSUM_DRIFT");
    if (row.state !== "applied") throw new Error("MIGRATION_INCOMPLETE");
  }
  const appliedVersions = new Set(rows.map((row) => Number(row.version)));
  const pending = MIGRATIONS.filter((migration) => !appliedVersions.has(migration.version));
  if (rows.length > 0 && pending.length > 0) createPreMigrationBackup(db, candidate, Math.max(...appliedVersions), clock);
  for (const migration of pending) {
    const sql = readFileSync(migration.path, "utf8");
    const checksum = digest(sql);
    const now = clock();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO schema_migrations(version,name,checksum,state,started_at) VALUES(?,?,?,?,?)").run(migration.version, migration.name, checksum, "pending", now);
      db.exec(sql);
      db.prepare("UPDATE schema_migrations SET state='applied',applied_at=? WHERE version=?").run(now, migration.version);
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }
  return { checksum: digest(identities), applied_count: pending.length, previous_version: rows.length === 0 ? 0 : Math.max(...appliedVersions) };
}

function configure(db) {
  db.exec("PRAGMA foreign_keys=ON");
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA synchronous=FULL");
  db.exec("PRAGMA trusted_schema=OFF");
  db.exec("PRAGMA busy_timeout=5000");
}

function databaseChecks(db, prefix = "STORE") {
  const integrity = db.prepare("PRAGMA integrity_check").all().flatMap((row) => Object.values(row));
  if (!integrity.every((value) => value === "ok")) throw new Error(`${prefix}_INTEGRITY_FAILURE`);
  const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeys.length > 0) throw new Error(`${prefix}_FOREIGN_KEY_FAILURE`);
  return { integrity, foreignKeys };
}

function verifyStateTransferAuthority({ operation, manifest, contentDigest, identity, verifier }) {
  if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.verifier_id !== "string" || verifier.verifier_id.length === 0 || typeof verifier.verify !== "function") throw new Error("STATE_TRANSFER_VERIFIER_REQUIRED");
  const fingerprint = digest({ operation, manifest, content_digest: contentDigest, identity });
  const verdict = verifier.verify({ operation, manifest: structuredClone(manifest), content_digest: contentDigest, identity: structuredClone(identity), fingerprint });
  if (verdict && typeof verdict.then === "function") throw new Error("STATE_TRANSFER_ASYNC_VERIFIER_UNSUPPORTED");
  if (verdict?.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== fingerprint || !/^[a-f0-9]{64}$/.test(verdict.proof_fingerprint ?? "")) throw new Error("STATE_TRANSFER_VERIFICATION_FAILED");
  return { verifier_id: verifier.verifier_id, fingerprint, proof_fingerprint: verdict.proof_fingerprint };
}

function assertMigrationIdentity(db, identity, prefix = "STORE") {
  const expectedMigrations = migrationIdentity();
  const migration = db.prepare("SELECT version,name,checksum,state FROM schema_migrations ORDER BY version").all();
  if (migration.length !== expectedMigrations.length || migration.some((row, index) => Number(row.version) !== expectedMigrations[index].version || row.name !== expectedMigrations[index].name || row.checksum !== expectedMigrations[index].checksum || row.state !== "applied")) throw new Error(`${prefix}_MIGRATION_INVALID`);
  const actualSchemaFingerprint = sqliteSchemaFingerprint(db);
  if (actualSchemaFingerprint !== expectedSqliteSchemaFingerprint()) throw new Error(`${prefix}_SQLITE_SCHEMA_INVALID`);
  const schema = getMeta(db, "schema");
  if (schema?.version !== STORE_SCHEMA_VERSION || schema?.migration_checksum !== digest(expectedMigrations) || schema?.sqlite_schema_fingerprint !== actualSchemaFingerprint) throw new Error(`${prefix}_SCHEMA_IDENTITY_INVALID`);
  const storeRevision = getMeta(db, "store_revision");
  const revocationEpoch = getMeta(db, "revocation_epoch");
  if (!Number.isSafeInteger(storeRevision) || storeRevision < 0 || !Number.isSafeInteger(revocationEpoch) || revocationEpoch < 0) throw new Error(`${prefix}_REQUIRED_METADATA_INVALID`);
  const storedIdentity = getMeta(db, "identity");
  if (canonicalJson(storedIdentity) !== canonicalJson(identity)) throw new Error(prefix === "RESTORE" ? "FOREIGN_CHECKOUT_RESTORE" : "STORE_IDENTITY_MISMATCH");
}

function recoveryState(db) {
  const intents = db.prepare(`
    SELECT i.effect_id,i.state,
      CASE WHEN o.intent_id IS NULL THEN 1 ELSE 0 END AS orphaned_outbox,
      CASE WHEN i.state='RECONCILED' AND (o.state!='delivered' OR r.intent_id IS NULL) THEN 1 ELSE 0 END AS inconsistent_terminal
    FROM effect_intents i
    LEFT JOIN outbox o ON o.intent_id=i.effect_id
    LEFT JOIN receipts r ON r.intent_id=i.effect_id
    WHERE i.state!='RECONCILED' OR o.intent_id IS NULL OR o.state!='delivered' OR r.intent_id IS NULL
    ORDER BY i.effect_id
  `).all();
  const outbox = db.prepare("SELECT outbox_id,intent_id,state FROM outbox WHERE state IN ('pending','sending') ORDER BY outbox_id").all();
  return { required: intents.length > 0 || outbox.length > 0, intents, outbox };
}

function randomSibling(target, label) {
  return `${target}.${label}-${randomUUID()}`;
}

function fsyncDirectory(directory) {
  const fd = openSync(directory, fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0));
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function writeExclusiveFile(target, bytes, { replace = true } = {}) {
  const directory = dirname(target);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = randomSibling(target, "tmp");
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const flags = fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | (fsConstants.O_NOFOLLOW ?? 0);
  const fd = openSync(temporary, flags, 0o600);
  try {
    let offset = 0;
    while (offset < buffer.length) offset += writeSync(fd, buffer, offset, buffer.length - offset);
    fsyncSync(fd);
  } catch (error) {
    try { unlinkSync(temporary); } catch {}
    throw error;
  } finally {
    closeSync(fd);
  }
  try {
    if (!replace && existsSync(target)) throw new Error("EXCLUSIVE_DESTINATION_EXISTS");
    renameSync(temporary, target);
    fsyncDirectory(directory);
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
    throw error;
  }
}

function incrementOpenCount(candidate) {
  OPEN_DATABASE_COUNTS.set(candidate, (OPEN_DATABASE_COUNTS.get(candidate) ?? 0) + 1);
}

function decrementOpenCount(candidate) {
  const next = (OPEN_DATABASE_COUNTS.get(candidate) ?? 1) - 1;
  if (next <= 0) OPEN_DATABASE_COUNTS.delete(candidate); else OPEN_DATABASE_COUNTS.set(candidate, next);
}

function normalizeRecord(record, identity, now) {
  assertPlainObject(record, "RECORD_REQUIRED");
  assertNoRawSecrets(record.payload ?? {});
  const required = ["id", "kind", "schema_version", "authority_scope", "lineage_id", "lifecycle_state", "source_revision", "policy_fp", "input_fp"];
  for (const field of required) if (typeof record[field] !== "string" || record[field].length === 0) throw new Error(`RECORD_FIELD_REQUIRED:${field}`);
  const sensitivity = record.sensitivity ?? "internal";
  if (!new Set(["public", "internal", "restricted"]).has(sensitivity)) throw new Error("RECORD_SENSITIVITY_INVALID");
  const payload = record.payload ?? {};
  return {
    id: record.id,
    kind: record.kind,
    schema_version: record.schema_version,
    record_revision: record.record_revision ?? 1,
    repository_id: identity.repository_logical_id,
    checkout_id: identity.checkout_instance_id,
    authority_scope: record.authority_scope,
    lineage_id: record.lineage_id,
    lifecycle_state: record.lifecycle_state,
    payload_json: canonicalJson(payload),
    source_revision: record.source_revision,
    policy_fp: record.policy_fp,
    input_fp: record.input_fp,
    content_fp: record.content_fp ?? digest(payload),
    sensitivity,
    fresh_until: record.fresh_until ?? null,
    created_at: record.created_at ?? now,
    superseded_by: record.superseded_by ?? null
  };
}

function assertDedicatedRecordWriterKinds(records, { allowEffectReceiptProof = false } = {}) {
  if (records.some((record) => record.kind === "Relationship")) throw new Error("RELATIONSHIP_LIFECYCLE_WRITER_REQUIRED");
  if (records.some((record) => record.kind === "NextWorkflowActivation")) throw new Error("ACTIVATION_LIFECYCLE_WRITER_REQUIRED");
  if (records.some((record) => AGENT_AUTHORITY_RECORD_KINDS.has(record.kind))) throw new Error("AGENT_AUTHORITY_RECORD_WRITER_REQUIRED");
  if (!allowEffectReceiptProof && records.some((record) => record.kind === "EffectReceiptProof")) throw new Error("RECONCILIATION_PROOF_WRITER_REQUIRED");
}

export function openWorkflowStateStore({ repositoryRoot, databasePath, expectedIdentity, mode = "readwrite", receiptProofVerifier, clock = () => new Date().toISOString() }) {
  const identity = normalizeIdentity(expectedIdentity);
  const defaultPath = join(realpathSync(repositoryRoot), ".workflow-state", "workflow.sqlite");
  const { root, candidate } = resolveSafePath(repositoryRoot, databasePath ?? defaultPath);
  if (mode !== "readwrite" && mode !== "readonly") throw new Error("STORE_MODE_INVALID");
  if (mode === "readwrite") mkdirSync(dirname(candidate), { recursive: true, mode: 0o700 });
  assertNoExistingSymlink(root, candidate);
  if (mode === "readonly" && !existsSync(candidate)) throw new Error("STORE_NOT_FOUND");
  const db = new DatabaseSync(candidate, { readOnly: mode === "readonly", allowExtension: false });
  let closed = false;
  let startupRecovery = { required: false, intents: [], outbox: [] };
  if (mode === "readwrite") {
    let migrationResult;
    let schemaBefore;
    let hadStoreMeta;
    try {
      configure(db);
      const applicationSchemaBefore = db.prepare("SELECT type,name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
      const freshDatabase = applicationSchemaBefore.length === 0;
      hadStoreMeta = Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='store_meta'").get());
      const hadMigrationLedger = Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='schema_migrations'").get());
      if (!freshDatabase && (!hadStoreMeta || !hadMigrationLedger)) throw new Error("STORE_BOOTSTRAP_SCHEMA_INCOMPLETE");
      schemaBefore = hadStoreMeta ? getMeta(db, "schema") : undefined;
      if (hadStoreMeta) {
        const requiredMeta = {
          identity: getMeta(db, "identity"),
          store_revision: getMeta(db, "store_revision"),
          revocation_epoch: getMeta(db, "revocation_epoch"),
          schema: schemaBefore
        };
        if (Object.values(requiredMeta).some((value) => value === undefined)
          || !Number.isSafeInteger(requiredMeta.store_revision) || requiredMeta.store_revision < 0
          || !Number.isSafeInteger(requiredMeta.revocation_epoch) || requiredMeta.revocation_epoch < 0) throw new Error("STORE_REQUIRED_METADATA_INVALID");
      }
      migrationResult = applyMigrations(db, candidate, clock);
    } catch (error) {
      db.close();
      throw error;
    }
    const storedIdentity = getMeta(db, "identity");
    if (storedIdentity && canonicalJson(storedIdentity) !== canonicalJson(identity)) {
      db.close();
      throw new Error("STORE_IDENTITY_MISMATCH");
    }
    if (!hadStoreMeta) {
      setMeta(db, "identity", identity);
      setMeta(db, "store_revision", 0);
      setMeta(db, "revocation_epoch", 0);
    }
    const actualSchemaFingerprint = sqliteSchemaFingerprint(db);
    if (actualSchemaFingerprint !== expectedSqliteSchemaFingerprint()) {
      db.close();
      throw new Error("STORE_SQLITE_SCHEMA_INVALID");
    }
    if (schemaBefore && migrationResult.applied_count === 0 && (schemaBefore.version !== STORE_SCHEMA_VERSION || schemaBefore.migration_checksum !== migrationResult.checksum || (schemaBefore.sqlite_schema_fingerprint !== undefined && schemaBefore.sqlite_schema_fingerprint !== actualSchemaFingerprint))) {
      db.close();
      throw new Error("STORE_SCHEMA_IDENTITY_INVALID");
    }
    if (schemaBefore && migrationResult.applied_count > 0 && schemaBefore.version !== migrationResult.previous_version) {
      db.close();
      throw new Error("STORE_SCHEMA_IDENTITY_INVALID");
    }
    setMeta(db, "schema", { version: STORE_SCHEMA_VERSION, migration_checksum: migrationResult.checksum, sqlite_schema_fingerprint: actualSchemaFingerprint });
    try {
      assertMigrationIdentity(db, identity);
      databaseChecks(db);
      startupRecovery = recoveryState(db);
    } catch (error) {
      db.close();
      throw error;
    }
  } else {
    db.exec("PRAGMA foreign_keys=ON");
    const storedIdentity = getMeta(db, "identity");
    if (canonicalJson(storedIdentity) !== canonicalJson(identity)) {
      db.close();
      throw new Error("STORE_IDENTITY_MISMATCH");
    }
    try {
      assertMigrationIdentity(db, identity);
      databaseChecks(db);
      startupRecovery = recoveryState(db);
    } catch (error) {
      db.close();
      throw error;
    }
  }
  incrementOpenCount(candidate);

  function assertOpen() {
    if (closed) throw new Error("STORE_CLOSED");
  }

  function assertWritable({ recovery = false } = {}) {
    assertOpen();
    if (mode !== "readwrite") throw new Error("STORE_READ_ONLY");
    if (startupRecovery.required && !recovery) throw new Error("STORE_RECOVERY_ONLY");
  }

  function persistedAgentRecord(kind, predicate) {
    const rows = db.prepare("SELECT * FROM records WHERE kind=? ORDER BY record_revision DESC,id").all(kind);
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload_json) })).find(predicate);
  }

  function delegationGrantCoreFromPayload(payload) {
    const {
      scope_fingerprint: ignoredScope,
      budget_fingerprint: ignoredBudget,
      ownership_fingerprint: ignoredOwnership,
      authority_epoch: ignoredEpoch,
      authority_id: ignoredAuthority,
      authority_proof_fingerprint: ignoredProof,
      fingerprint: ignoredFingerprint,
      ...grant
    } = payload;
    return grant;
  }

  function assertStoredDelegationContained(child, parent) {
    const contains = (parentPath, childPath) => parentPath === childPath || childPath.startsWith(`${parentPath}/`);
    const subset = (childValues, parentValues) => Array.isArray(childValues) && Array.isArray(parentValues) && childValues.every((value) => parentValues.includes(value));
    if (child.parent_grant_id !== parent.grant_id || child.parent_grant_fingerprint !== parent.fingerprint || child.parent_agent_id !== parent.child_agent_id || child.parent_role !== parent.child_role || child.parent_depth !== parent.child_depth || child.authority_fingerprint !== parent.authority_fingerprint) throw new Error("DELEGATION_GRANT_PARENT_CHAIN_INVALID");
    if (Date.parse(child.expires_at) > Date.parse(parent.expires_at)) throw new Error("DELEGATION_GRANT_EXPIRY_EXPANSION");
    for (const key of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(child.budget?.[key]) || child.budget[key] > parent.budget?.[key]) throw new Error(`DELEGATION_GRANT_BUDGET_EXPANSION:${key}`);
    if (!Array.isArray(child.scope?.paths) || !Array.isArray(parent.scope?.paths) || child.scope.paths.some((childPath) => !parent.scope.paths.some((parentPath) => contains(parentPath, childPath)))) throw new Error("DELEGATION_GRANT_SCOPE_EXPANSION");
    if (child.ownership?.read_only === false && (parent.ownership?.read_only !== false || !Array.isArray(child.ownership?.paths) || !Array.isArray(parent.ownership?.paths) || child.ownership.paths.some((childPath) => !parent.ownership.paths.some((parentPath) => contains(parentPath, childPath))))) throw new Error("DELEGATION_GRANT_OWNERSHIP_EXPANSION");
    if (!subset(child.allowed_actions, parent.allowed_actions) || !subset(child.allowed_tools, parent.allowed_tools) || !subset(child.capabilities, parent.capabilities)) throw new Error("DELEGATION_GRANT_CAPABILITY_EXPANSION");
    const modeRank = { read_only: 0, workspace_write: 1 };
    if (!(child.sandbox?.mode in modeRank) || !(parent.sandbox?.mode in modeRank) || modeRank[child.sandbox.mode] > modeRank[parent.sandbox.mode] || (child.sandbox.network === true && parent.sandbox.network !== true) || !Array.isArray(child.sandbox?.writable_paths) || !Array.isArray(parent.sandbox?.writable_paths) || child.sandbox.writable_paths.some((childPath) => !parent.sandbox.writable_paths.some((parentPath) => contains(parentPath, childPath)))) throw new Error("DELEGATION_GRANT_SANDBOX_EXPANSION");
  }

  function validateAgentAuthorityRecordForWriter(writerKind, record, event, now) {
    if (record.kind !== writerKind) throw new Error("AGENT_AUTHORITY_RECORD_KIND_MISMATCH");
    const payload = record.payload;
    assertPlainObject(payload, "AGENT_AUTHORITY_RECORD_PAYLOAD_INVALID");
    if (!Number.isSafeInteger(payload.authority_epoch) || payload.authority_epoch < 0 || payload.authority_epoch !== Number(getMeta(db, "revocation_epoch") ?? 0) || !Number.isFinite(Date.parse(record.fresh_until)) || Date.parse(record.fresh_until) <= Date.parse(now)) throw new Error("AGENT_AUTHORITY_RECORD_EPOCH_OR_FRESHNESS_INVALID");
    if (writerKind === "DelegationGrant") {
      const grant = delegationGrantCoreFromPayload(payload);
      if (record.lifecycle_state !== "AUTHORIZED" || record.id !== `delegation-grant-${payload.grant_id}` || record.lineage_id !== payload.grant_id || record.input_fp !== payload.fingerprint || payload.fingerprint !== digest(grant) || record.fresh_until !== payload.expires_at || payload.scope_fingerprint !== digest(payload.scope) || payload.budget_fingerprint !== digest(payload.budget) || payload.ownership_fingerprint !== digest(payload.ownership) || event.event_type !== "DELEGATION_GRANT_AUTHORIZED") throw new Error("DELEGATION_GRANT_RECORD_INVALID");
      if (payload.ownership?.read_only === false && ((payload.child_depth === 1 && payload.child_role !== "Implementation Lead") || (payload.child_depth === 2 && payload.parent_role !== "Implementation Lead"))) throw new Error("DELEGATION_GRANT_WRITE_ROLE_INVALID");
      if (payload.child_depth === 1) {
        if (payload.parent_agent_id !== "orchestrator" || payload.parent_role !== "Orchestrator Agent" || payload.parent_depth !== 0 || payload.parent_grant_id !== null || payload.parent_grant_fingerprint !== null || record.source_revision !== "orchestrator-root") throw new Error("DELEGATION_GRANT_ROOT_CHAIN_INVALID");
      } else if (payload.child_depth === 2) {
        const parent = persistedAgentRecord("DelegationGrant", (candidate) => candidate.id === `delegation-grant-${payload.parent_grant_id}` && candidate.lifecycle_state === "AUTHORIZED");
        if (!parent || parent.payload?.authority_epoch !== payload.authority_epoch || !Number.isFinite(Date.parse(parent.fresh_until)) || Date.parse(parent.fresh_until) <= Date.parse(now) || record.source_revision !== payload.parent_grant_fingerprint) throw new Error("DELEGATION_GRANT_PARENT_CHAIN_INVALID");
        assertStoredDelegationContained(payload, parent.payload);
      } else {
        throw new Error("DELEGATION_GRANT_DEPTH_INVALID");
      }
      return;
    }
    if (writerKind === "ResourceCostReservation") {
      if (record.lifecycle_state !== "AUTHORIZED" || payload.reservation_id !== record.id || !["launch", "retry"].includes(payload.purpose) || typeof payload.grant_fingerprint !== "string" || typeof payload.child_agent_id !== "string" || payload.consumed !== false || !Array.isArray(payload.targets) || payload.targets.length === 0 || !payload.budget || record.input_fp !== digest(payload) || event.event_type !== "RESOURCE_COST_RESERVED") throw new Error("RESOURCE_COST_RESERVATION_RECORD_INVALID");
      for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(payload.budget[field]) || payload.budget[field] < 0) throw new Error(`RESOURCE_COST_RESERVATION_BUDGET_INVALID:${field}`);
      const grant = persistedAgentRecord("DelegationGrant", (candidate) => candidate.lifecycle_state === "AUTHORIZED" && candidate.payload?.fingerprint === payload.grant_fingerprint && candidate.payload?.child_agent_id === payload.child_agent_id && candidate.payload?.authority_epoch === payload.authority_epoch && Date.parse(candidate.fresh_until) > Date.parse(now));
      if (!grant) throw new Error("RESOURCE_COST_RESERVATION_GRANT_REQUIRED");
      if (payload.targets.some((target) => !grant.payload.scope?.paths?.some((scopePath) => target === scopePath || target.startsWith(`${scopePath}/`)))) throw new Error("RESOURCE_COST_RESERVATION_TARGET_OUTSIDE_GRANT");
      for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (payload.budget[field] > grant.payload.budget?.[field]) throw new Error(`RESOURCE_COST_RESERVATION_EXCEEDS_GRANT:${field}`);
      if (payload.purpose === "retry" && (typeof payload.run_id !== "string" || typeof payload.material_change_fingerprint !== "string")) throw new Error("RESOURCE_COST_RETRY_BINDING_REQUIRED");
      return;
    }
    if (writerKind === "AgentReviewerAssignment") {
      const kinds = { lead: ["Value Design Lead", "Planning Design Lead", "Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"], orchestrator: ["Orchestrator Agent"], validator: ["Safety and Acceptance Decision Lead"] };
      if (record.lifecycle_state !== "AUTHORIZED" || !kinds[payload.assignment_kind]?.includes(payload.agent_role) || typeof payload.run_id !== "string" || typeof payload.agent_id !== "string" || payload.read_only !== true || payload.grant_fingerprint !== record.source_revision || event.event_type !== "AGENT_REVIEWER_ASSIGNED") throw new Error("AGENT_REVIEWER_ASSIGNMENT_RECORD_INVALID");
      const grant = persistedAgentRecord("DelegationGrant", (candidate) => candidate.lifecycle_state === "AUTHORIZED" && candidate.payload?.fingerprint === payload.grant_fingerprint && candidate.payload?.authority_epoch === payload.authority_epoch && Date.parse(candidate.fresh_until) > Date.parse(now));
      if (!grant || grant.payload.child_agent_id === payload.agent_id) throw new Error("AGENT_REVIEWER_ASSIGNMENT_GRANT_INVALID");
      return;
    }
    if (["AgentLeadReview", "AgentOrchestratorReview", "AgentValidatorDisposition"].includes(writerKind)) {
      const expectedAssignmentKind = { AgentLeadReview: "lead", AgentOrchestratorReview: "orchestrator", AgentValidatorDisposition: "validator" }[writerKind];
      const assignment = persistedAgentRecord("AgentReviewerAssignment", (candidate) => candidate.id === record.source_revision);
      if (!assignment || assignment.payload?.assignment_kind !== expectedAssignmentKind || assignment.payload?.agent_id !== payload.agent_id || assignment.payload?.authority_epoch !== payload.authority_epoch || payload.assignment_fingerprint !== digest(assignment.payload) || payload.accepted !== true || typeof payload.result_fingerprint !== "string" || record.input_fp !== payload.result_fingerprint || (writerKind === "AgentValidatorDisposition" && payload.decision !== "PASS")) throw new Error("AGENT_REVIEW_RECORD_INVALID");
      const expectedEvent = writerKind === "AgentValidatorDisposition" ? "AGENT_VALIDATOR_DISPOSITION_RECORDED" : "AGENT_REVIEW_RECORDED";
      if (event.event_type !== expectedEvent) throw new Error("AGENT_REVIEW_EVENT_INVALID");
      return;
    }
    if (writerKind === "ValidatorDecision") {
      if (record.lifecycle_state !== "PASS" || payload.decision !== "PASS" || payload.independent !== true || payload.decision_id !== record.id || typeof payload.run_id !== "string" || typeof payload.failure_fingerprint !== "string" || typeof payload.material_change_fingerprint !== "string" || typeof payload.retry_reservation_id !== "string" || typeof payload.validator_agent_id !== "string" || record.input_fp !== payload.failure_fingerprint || event.event_type !== "VALIDATOR_DECISION_RECORDED") throw new Error("VALIDATOR_DECISION_RECORD_INVALID");
      const reservation = persistedAgentRecord("ResourceCostReservation", (candidate) => candidate.id === payload.retry_reservation_id);
      if (!reservation || reservation.payload?.purpose !== "retry" || reservation.payload?.run_id !== payload.run_id || reservation.payload?.material_change_fingerprint !== payload.material_change_fingerprint || reservation.payload?.authority_epoch !== payload.authority_epoch) throw new Error("VALIDATOR_DECISION_RESERVATION_BINDING_INVALID");
      return;
    }
    throw new Error("AGENT_AUTHORITY_RECORD_WRITER_INVALID");
  }

  function persistVerifiedAgentAuthorityRecord({ expectedRevision, record, event, verifier, writerKind }) {
    assertWritable();
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || !record || !event) throw new Error("AGENT_AUTHORITY_RECORD_INPUT_INVALID");
    if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.authority_id !== "string" || typeof verifier.verify !== "function") throw new Error("AGENT_AUTHORITY_RECORD_VERIFIER_REQUIRED");
    assertNoRawSecrets({ record, event });
    const now = clock();
    db.exec("BEGIN IMMEDIATE");
    try {
      const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
      if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      validateAgentAuthorityRecordForWriter(writerKind, record, event, now);
      const authorityFingerprint = digest({ record, locked_revision: lockedRevision });
      const verdict = verifier.verify({ record: structuredClone(record), fingerprint: authorityFingerprint, locked_revision: lockedRevision, now });
      if (verdict && typeof verdict.then === "function") throw new Error("AGENT_AUTHORITY_RECORD_ASYNC_VERIFIER_UNSUPPORTED");
      if (verdict?.verified !== true || verdict.authority_id !== verifier.authority_id || verdict.fingerprint !== authorityFingerprint || !/^[a-f0-9]{64}$/.test(verdict.proof_fingerprint ?? "")) throw new Error("AGENT_AUTHORITY_RECORD_VERIFICATION_FAILED");
      const normalized = normalizeRecord({ ...record, payload: { ...record.payload, authority_id: verifier.authority_id, authority_proof_fingerprint: verdict.proof_fingerprint } }, identity, now);
      db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(normalized));
      db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)").run(event.event_id, event.aggregate_id ?? normalized.id, event.event_type, canonicalJson({ ...(event.payload ?? {}), authority_proof_fingerprint: verdict.proof_fingerprint }), event.authority_decision_id ?? verifier.authority_id, event.created_at ?? now);
      setMeta(db, "store_revision", lockedRevision + 1);
      db.exec("COMMIT");
      return { revision: lockedRevision + 1, record_id: normalized.id, kind: normalized.kind, authority_id: verifier.authority_id, proof_fingerprint: verdict.proof_fingerprint };
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  const api = {
    get path() { return candidate; },
    get repository_root() { return root; },
    get identity() { return structuredClone(identity); },
    get mode() { assertOpen(); return mode === "readonly" ? "readonly" : startupRecovery.required ? "recovery-only" : "readwrite"; },
    get recovery_only() { assertOpen(); return startupRecovery.required; },
    get recovery_state() { assertOpen(); return structuredClone(startupRecovery); },
    get revision() { assertOpen(); return Number(getMeta(db, "store_revision") ?? 0); },
    get revocation_epoch() { assertOpen(); return Number(getMeta(db, "revocation_epoch") ?? 0); },
    commit({ expectedRevision, authorityEpoch, records = [], relations = [], events = [], evidenceRefs = [], effectIntent, outboxItem, receipt, settingsPlan, settingsPlanUse } = {}) {
      assertWritable();
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("EXPECTED_REVISION_REQUIRED");
      if (authorityEpoch !== undefined && (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0)) throw new Error("AUTHORITY_EPOCH_INVALID");
      if (Boolean(effectIntent) !== Boolean(outboxItem) || (effectIntent && outboxItem.intent_id !== effectIntent.effect_id)) throw new Error("EFFECT_OUTBOX_ATOMIC_PAIR_REQUIRED");
      if (effectIntent && authorityEpoch === undefined) throw new Error("EFFECT_AUTHORITY_EPOCH_REQUIRED");
      assertNoRawSecrets({ records, relations, events, evidenceRefs, effectIntent, outboxItem, receipt, settingsPlan, settingsPlanUse });
      const currentRevision = api.revision;
      if (currentRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      assertDedicatedRecordWriterKinds(records);
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (authorityEpoch !== undefined && Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
        const insertRecord = db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const input of records) insertRecord.run(...Object.values(normalizeRecord(input, identity, now)));
        const insertRelation = db.prepare("INSERT INTO relations(from_id,relation_kind,to_id) VALUES(?,?,?)");
        for (const relation of relations) insertRelation.run(relation.from_id, relation.relation_kind, relation.to_id);
        const insertEvent = db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)");
        for (const event of events) insertEvent.run(event.event_id, event.aggregate_id ?? null, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? null, event.created_at ?? now);
        for (const evidenceRef of evidenceRefs) {
          if (typeof evidenceRef !== "string" || evidenceRef.length === 0) throw new Error("EVIDENCE_REFERENCE_INVALID");
        }
        if (effectIntent) {
          if (effectIntent.state !== undefined && effectIntent.state !== "PREPARED") throw new Error("EFFECT_INITIAL_STATE_INVALID");
          db.prepare("INSERT INTO effect_intents(effect_id,effect_key,request_fp,authority_fp,target_id,operation,expected_selector_json,attempt_lineage,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(effectIntent.effect_id, effectIntent.effect_key, effectIntent.request_fp, effectIntent.authority_fp, effectIntent.target_id, effectIntent.operation, canonicalJson(effectIntent.expected_selector ?? {}), effectIntent.attempt_lineage, effectIntent.state ?? "PREPARED", effectIntent.created_at ?? now);
        }
        if (outboxItem) {
          if (outboxItem.state !== undefined && outboxItem.state !== "pending") throw new Error("OUTBOX_INITIAL_STATE_INVALID");
          db.prepare("INSERT INTO outbox(outbox_id,intent_id,message_fp,sequence,state,attempts) VALUES(?,?,?,?,?,?)").run(outboxItem.outbox_id, outboxItem.intent_id, outboxItem.message_fp, outboxItem.sequence, outboxItem.state ?? "pending", outboxItem.attempts ?? 0);
        }
        if (receipt) {
          if (typeof receipt.proof_record_id !== "string" || receipt.proof_record_id.length === 0) throw new Error("RECEIPT_PROOF_RECORD_REQUIRED");
          db.prepare("INSERT INTO receipts(receipt_id,intent_id,object_identity,observation_fp,proof_record_id,result,created_at) VALUES(?,?,?,?,?,?,?)").run(receipt.receipt_id, receipt.intent_id, receipt.object_identity, receipt.observation_fp, receipt.proof_record_id, receipt.result, receipt.created_at ?? now);
        }
        if (settingsPlan) {
          if (!/^[a-f0-9]{64}$/.test(settingsPlan.token_hash) || typeof settingsPlan.plan_fingerprint !== "string") throw new Error("SETTINGS_PLAN_STORAGE_INVALID");
          db.prepare("INSERT INTO settings_change_plans(token_hash,plan_fingerprint,plan_json,state,issued_at,expires_at,used_at) VALUES(?,?,?,'pending',?,?,NULL)").run(settingsPlan.token_hash, settingsPlan.plan_fingerprint, canonicalJson(settingsPlan.plan), settingsPlan.issued_at, settingsPlan.expires_at);
        }
        if (settingsPlanUse) {
          const usedAt = settingsPlanUse.used_at ?? now;
          const used = db.prepare("UPDATE settings_change_plans SET state='used',used_at=? WHERE token_hash=? AND state='pending' AND expires_at>=?").run(usedAt, settingsPlanUse.token_hash, usedAt);
          if (Number(used.changes) !== 1) {
            const found = db.prepare("SELECT state,expires_at FROM settings_change_plans WHERE token_hash=?").get(settingsPlanUse.token_hash);
            if (!found) throw new Error("SETTINGS_PLAN_NOT_FOUND");
            if (found.state === "used") throw new Error("SETTINGS_PLAN_ALREADY_USED");
            throw new Error("SETTINGS_PLAN_EXPIRED");
          }
        }
        setMeta(db, "store_revision", lockedRevision + 1);
        if (evidenceRefs.length > 0) setMeta(db, `evidence_refs:${lockedRevision + 1}`, evidenceRefs);
        db.exec("COMMIT");
        return { revision: lockedRevision + 1, committed_at: now };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    get({ id }) {
      assertOpen();
      const row = db.prepare("SELECT * FROM records WHERE id=?").get(id);
      if (!row) return undefined;
      return { ...row, payload: JSON.parse(row.payload_json) };
    },
    query({ kind, state, limit = 100, cursor = 0 } = {}) {
      assertOpen();
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(cursor) || cursor < 0) throw new Error("QUERY_BOUND_INVALID");
      const clauses = [];
      const args = [];
      if (kind) { clauses.push("kind=?"); args.push(kind); }
      if (state) { clauses.push("lifecycle_state=?"); args.push(state); }
      const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
      const rows = db.prepare(`SELECT * FROM records${where} ORDER BY id LIMIT ? OFFSET ?`).all(...args, limit, cursor);
      return { records: rows.map((row) => ({ ...row, payload: JSON.parse(row.payload_json) })), next_cursor: rows.length === limit ? cursor + limit : null };
    },
    getEvent(eventId) {
      assertOpen();
      if (typeof eventId !== "string" || eventId.length === 0) throw new Error("EVENT_ID_REQUIRED");
      const row = db.prepare("SELECT * FROM events WHERE event_id=?").get(eventId);
      return row ? { ...row, payload: JSON.parse(row.payload_json) } : undefined;
    },
    getSettingsChangePlan({ tokenHash }) {
      assertOpen();
      if (!/^[a-f0-9]{64}$/.test(tokenHash)) throw new Error("SETTINGS_TOKEN_INVALID");
      const row = db.prepare("SELECT * FROM settings_change_plans WHERE token_hash=?").get(tokenHash);
      return row ? { ...row, plan: JSON.parse(row.plan_json) } : undefined;
    },
    persistDelegationGrantAuthority(input) { return persistVerifiedAgentAuthorityRecord({ ...input, writerKind: "DelegationGrant" }); },
    persistResourceCostReservationAuthority(input) { return persistVerifiedAgentAuthorityRecord({ ...input, writerKind: "ResourceCostReservation" }); },
    persistReviewerAssignmentAuthority(input) { return persistVerifiedAgentAuthorityRecord({ ...input, writerKind: "AgentReviewerAssignment" }); },
    persistAgentReviewAuthority(input) {
      const assignmentKind = input?.record?.payload?.assignment_kind;
      const writerKind = { lead: "AgentLeadReview", orchestrator: "AgentOrchestratorReview", validator: "AgentValidatorDisposition" }[assignmentKind];
      if (!writerKind) throw new Error("AGENT_REVIEW_RECORD_INVALID");
      return persistVerifiedAgentAuthorityRecord({ ...input, writerKind });
    },
    persistValidatorDecisionAuthority(input) { return persistVerifiedAgentAuthorityRecord({ ...input, writerKind: "ValidatorDecision" }); },
    claimEffectDispatch({ effectId, outboxId, authorityEpoch }) {
      assertWritable();
      if (typeof effectId !== "string" || effectId.length === 0 || typeof outboxId !== "string" || outboxId.length === 0) throw new Error("EFFECT_DISPATCH_IDENTITY_REQUIRED");
      if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("AUTHORITY_EPOCH_INVALID");
      db.exec("BEGIN IMMEDIATE");
      try {
        if (Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
        const intent = db.prepare("UPDATE effect_intents SET state='DISPATCHING' WHERE effect_id=? AND state='PREPARED'").run(effectId);
        if (Number(intent.changes) !== 1) throw new Error("EFFECT_STATE_CONFLICT");
        const outbox = db.prepare("UPDATE outbox SET state='sending',attempts=attempts+1 WHERE outbox_id=? AND intent_id=? AND state='pending'").run(outboxId, effectId);
        if (Number(outbox.changes) !== 1) throw new Error("OUTBOX_STATE_CONFLICT");
        db.exec("COMMIT");
        return { effect_id: effectId, outbox_id: outboxId, intent_state: "DISPATCHING", outbox_state: "sending", authority_epoch: authorityEpoch };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    assertAuthorityEpoch({ authorityEpoch }) {
      assertOpen();
      if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("AUTHORITY_EPOCH_INVALID");
      if (Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
      return { authority_epoch: authorityEpoch };
    },
    transitionIntent({ effectId, expectedState, nextState, recovery = false }) {
      assertWritable({ recovery });
      if (nextState === "RECONCILED") throw new Error("EFFECT_RECONCILIATION_FINALIZER_REQUIRED");
      if (!INTENT_TRANSITIONS.get(expectedState)?.has(nextState)) throw new Error("EFFECT_STATE_TRANSITION_INVALID");
      const result = db.prepare("UPDATE effect_intents SET state=? WHERE effect_id=? AND state=?").run(nextState, effectId, expectedState);
      if (Number(result.changes) !== 1) throw new Error("EFFECT_STATE_CONFLICT");
      if (recovery) startupRecovery = recoveryState(db);
      return { effect_id: effectId, state: nextState };
    },
    getIntent(effectId) {
      assertOpen();
      const row = db.prepare("SELECT * FROM effect_intents WHERE effect_id=?").get(effectId);
      return row ? { ...row, expected_selector: JSON.parse(row.expected_selector_json) } : undefined;
    },
    getReceipt(effectId) {
      assertOpen();
      const row = db.prepare("SELECT * FROM receipts WHERE intent_id=?").get(effectId);
      return row ? { ...row } : undefined;
    },
    getOutbox({ outboxId, intentId } = {}) {
      assertOpen();
      if (!outboxId && !intentId) throw new Error("OUTBOX_SELECTOR_REQUIRED");
      const row = outboxId ? db.prepare("SELECT * FROM outbox WHERE outbox_id=?").get(outboxId) : db.prepare("SELECT * FROM outbox WHERE intent_id=?").get(intentId);
      return row ? { ...row } : undefined;
    },
    getSagaReplayState({ relationshipId }) {
      assertOpen();
      if (typeof relationshipId !== "string" || relationshipId.length === 0) throw new Error("SAGA_RELATIONSHIP_REQUIRED");
      const row = db.prepare("SELECT * FROM saga_replay_state WHERE relationship_id=?").get(relationshipId);
      return row ? { ...row, nonces: db.prepare("SELECT nonce,message_fp,accepted_at FROM saga_nonces WHERE relationship_id=? ORDER BY accepted_at,nonce").all(relationshipId) } : { relationship_id: relationshipId, authority_epoch: null, last_sequence: 0, last_message_fp: null, nonces: [] };
    },
    getCurrentRelationship({ relationshipId }) {
      assertOpen();
      if (typeof relationshipId !== "string" || relationshipId.length === 0) throw new Error("RELATIONSHIP_ID_REQUIRED");
      const row = db.prepare("SELECT * FROM records WHERE kind='Relationship' AND lineage_id=? ORDER BY record_revision DESC LIMIT 1").get(relationshipId);
      return row ? { record: { ...row, payload: JSON.parse(row.payload_json) }, revocation_epoch: Number(getMeta(db, "revocation_epoch") ?? 0) } : undefined;
    },
    hasPreexistingIntent({ effectId, targetId, before }) {
      assertOpen();
      if (typeof effectId !== "string" || typeof targetId !== "string" || !Number.isFinite(Date.parse(before))) return false;
      const row = db.prepare("SELECT effect_id,target_id,created_at FROM effect_intents WHERE effect_id=? AND target_id=?").get(effectId, targetId);
      return Boolean(row && Number.isFinite(Date.parse(row.created_at)) && Date.parse(row.created_at) < Date.parse(before));
    },
    acceptSagaMessage({ expectedRevision, relationshipId, relationshipRecordFingerprint, authorityEpoch, sequence, nonce, messageFingerprint, senderId, verifierId, recipientInstanceId, leaseId, revocationState, messageKeyReference, messageType, intentId = null, acceptedAt, event }) {
      assertWritable({ recovery: true });
      if (!Number.isInteger(expectedRevision) || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (typeof relationshipId !== "string" || relationshipId.length === 0 || !/^[a-f0-9]{64}$/.test(relationshipRecordFingerprint ?? "") || !Number.isInteger(authorityEpoch) || authorityEpoch < 0 || !Number.isInteger(sequence) || sequence < 1 || typeof nonce !== "string" || nonce.length === 0 || !/^[a-f0-9]{64}$/.test(messageFingerprint) || typeof senderId !== "string" || typeof verifierId !== "string" || typeof recipientInstanceId !== "string" || typeof leaseId !== "string" || revocationState !== "active" || typeof messageKeyReference !== "string" || typeof messageType !== "string" || !Number.isFinite(Date.parse(acceptedAt))) throw new Error("SAGA_REPLAY_INPUT_INVALID");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        if (Number(getMeta(db, "store_revision") ?? 0) !== expectedRevision) throw new Error("REVISION_CONFLICT");
        const relationshipRow = db.prepare("SELECT * FROM records WHERE kind='Relationship' AND lineage_id=? ORDER BY record_revision DESC LIMIT 1").get(relationshipId);
        if (!relationshipRow || relationshipRow.content_fp !== relationshipRecordFingerprint) throw new Error("SAGA_RELATIONSHIP_CHANGED_OR_MISSING");
        const relationship = JSON.parse(relationshipRow.payload_json);
        const liveEpoch = Number(getMeta(db, "revocation_epoch") ?? 0);
        if (relationship.relationship_id !== relationshipId || !["ACTIVE", "DRAINING"].includes(relationship.state) || relationshipRow.lifecycle_state !== relationship.state || relationship.authority_epoch !== authorityEpoch || liveEpoch !== authorityEpoch || relationship.sender_id !== senderId || relationship.verifier_id !== verifierId || relationship.recipient_instance_id !== recipientInstanceId || relationship.message_key_reference !== messageKeyReference || relationship.revocation_state !== revocationState || relationship.lease?.id !== leaseId || relationship.lease?.state !== "active" || !Number.isFinite(Date.parse(relationship.lease?.expires_at)) || Date.parse(relationship.lease.expires_at) < Date.parse(acceptedAt)) throw new Error("SAGA_RELATIONSHIP_AUTHORITY_INVALID");
        if (relationship.state === "DRAINING") {
          if (!SAGA_DRAINING_MESSAGE_TYPES.has(messageType) || typeof intentId !== "string" || !Number.isFinite(Date.parse(relationship.draining_started_at))) throw new Error("SAGA_DRAINING_SCOPE_INVALID");
          const intent = db.prepare("SELECT effect_id,target_id,created_at FROM effect_intents WHERE effect_id=? AND target_id=?").get(intentId, relationshipId);
          if (!intent || !Number.isFinite(Date.parse(intent.created_at)) || Date.parse(intent.created_at) >= Date.parse(relationship.draining_started_at)) throw new Error("SAGA_DRAINING_SCOPE_INVALID");
        }
        const current = db.prepare("SELECT authority_epoch,last_sequence FROM saga_replay_state WHERE relationship_id=?").get(relationshipId);
        if (current && Number(current.authority_epoch) !== authorityEpoch) throw new Error("SAGA_REPLAY_AUTHORITY_EPOCH_CONFLICT");
        if (sequence !== Number(current?.last_sequence ?? 0) + 1) throw new Error("SAGA_SEQUENCE_GAP_OR_REPLAY");
        if (db.prepare("SELECT 1 FROM saga_nonces WHERE relationship_id=? AND nonce=?").get(relationshipId, nonce)) throw new Error("SAGA_NONCE_REPLAY");
        if (current) db.prepare("UPDATE saga_replay_state SET last_sequence=?,last_message_fp=?,updated_at=? WHERE relationship_id=? AND authority_epoch=? AND last_sequence=?").run(sequence, messageFingerprint, now, relationshipId, authorityEpoch, current.last_sequence);
        else db.prepare("INSERT INTO saga_replay_state(relationship_id,authority_epoch,last_sequence,last_message_fp,updated_at) VALUES(?,?,?,?,?)").run(relationshipId, authorityEpoch, sequence, messageFingerprint, now);
        db.prepare("INSERT INTO saga_nonces(relationship_id,nonce,message_fp,accepted_at) VALUES(?,?,?,?)").run(relationshipId, nonce, messageFingerprint, now);
        db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,NULL,'SAGA_MESSAGE_ACCEPTED',?,NULL,?)").run(event?.event_id ?? `saga-message-${messageFingerprint}`, canonicalJson(event?.payload ?? { relationship_id: relationshipId, authority_epoch: authorityEpoch, sequence, message_fingerprint: messageFingerprint }), event?.created_at ?? now);
        setMeta(db, "store_revision", expectedRevision + 1);
        db.exec("COMMIT");
        return { revision: expectedRevision + 1, relationship_id: relationshipId, authority_epoch: authorityEpoch, last_sequence: sequence, last_message_fp: messageFingerprint };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    listUnresolvedEffects({ targetId } = {}) {
      assertOpen();
      const whereTarget = targetId ? " AND i.target_id=?" : "";
      const rows = db.prepare(`
        SELECT i.effect_id,i.effect_key,i.request_fp,i.authority_fp,i.target_id,i.operation,i.expected_selector_json,i.attempt_lineage,i.state AS intent_state,
               o.outbox_id,o.message_fp,o.sequence,o.state AS outbox_state,o.attempts
        FROM effect_intents i LEFT JOIN outbox o ON o.intent_id=i.effect_id
        WHERE (i.state!='RECONCILED' OR o.state!='delivered')${whereTarget}
        ORDER BY i.effect_id
      `).all(...(targetId ? [targetId] : []));
      return rows.map((row) => ({ ...row, expected_selector: JSON.parse(row.expected_selector_json) }));
    },
    persistRelationshipInitialization({ expectedRevision, relationshipId, initialState, record, event, verifier }) {
      assertWritable();
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || typeof relationshipId !== "string" || relationshipId.length === 0 || !["ACTIVE", "DETACHED"].includes(initialState) || !record || record.kind !== "Relationship" || !event) throw new Error("RELATIONSHIP_INITIALIZATION_INPUT_INVALID");
      if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("RELATIONSHIP_INITIALIZATION_VERIFIER_REQUIRED");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (db.prepare("SELECT 1 FROM records WHERE kind='Relationship' AND lineage_id=? LIMIT 1").get(relationshipId)) throw new Error("RELATIONSHIP_ALREADY_INITIALIZED");
        if (record.lineage_id !== relationshipId || record.record_revision !== 1 || record.lifecycle_state !== initialState || record.payload?.relationship_id !== relationshipId || record.payload?.state !== initialState || !Number.isSafeInteger(record.payload?.authority_epoch) || record.payload.authority_epoch !== Number(getMeta(db, "revocation_epoch") ?? 0) || !/^[a-f0-9]{64}$/.test(record.payload?.initialization_fingerprint ?? "") || !/^[a-f0-9]{64}$/.test(record.payload?.initialization_proof_fingerprint ?? "") || record.input_fp !== record.payload.initialization_fingerprint || record.policy_fp !== record.payload.initialization_proof_fingerprint) throw new Error("RELATIONSHIP_INITIAL_RECORD_INVALID");
        const verificationFingerprint = digest({ relationship_id: relationshipId, initial_state: initialState, proposed_record: record, event, locked_revision: lockedRevision });
        const verdict = verifier.verify({ proposed_record: structuredClone(record), event: structuredClone(event), fingerprint: verificationFingerprint, locked_revision: lockedRevision, now });
        if (verdict && typeof verdict.then === "function") throw new Error("RELATIONSHIP_INITIALIZATION_ASYNC_VERIFIER_UNSUPPORTED");
        if (verdict?.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== verificationFingerprint || verdict.proof_fingerprint !== record.payload.initialization_proof_fingerprint) throw new Error("RELATIONSHIP_INITIALIZATION_VERIFICATION_FAILED");
        const normalized = normalizeRecord(record, identity, now);
        db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(normalized));
        db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)").run(event.event_id, event.aggregate_id ?? normalized.id, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? verifier.verifier_id, event.created_at ?? now);
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { revision: lockedRevision + 1, relationship_id: relationshipId, state: initialState, record_id: normalized.id };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    persistRelationshipLifecycle({ expectedRevision, relationshipId, expectedState, nextState, record, event, quarantine = false, verifier }) {
      assertWritable();
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (typeof relationshipId !== "string" || relationshipId.length === 0 || !record || record.kind !== "Relationship" || !event || typeof event.event_id !== "string") throw new Error("RELATIONSHIP_LIFECYCLE_INPUT_INVALID");
      if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("RELATIONSHIP_LIFECYCLE_VERIFIER_REQUIRED");
      if (!RELATIONSHIP_TRANSITIONS.get(expectedState)?.has(nextState)) throw new Error(`RELATIONSHIP_TRANSITION_INVALID:${expectedState}:${nextState}`);
      if (quarantine && nextState !== "REVOKED") throw new Error("RELATIONSHIP_QUARANTINE_REQUIRES_REVOKE");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        if (Number(getMeta(db, "store_revision") ?? 0) !== expectedRevision) throw new Error("REVISION_CONFLICT");
        const currentRow = db.prepare("SELECT * FROM records WHERE kind='Relationship' AND lineage_id=? ORDER BY record_revision DESC LIMIT 1").get(relationshipId);
        if (!currentRow) throw new Error("RELATIONSHIP_RECORD_REQUIRED");
        const currentPayload = JSON.parse(currentRow.payload_json);
        if (currentPayload.relationship_id !== relationshipId || currentPayload.state !== expectedState || record.payload?.state !== nextState) throw new Error("RELATIONSHIP_STATE_CONFLICT");
        if (record.lineage_id !== relationshipId || record.record_revision !== Number(currentRow.record_revision) + 1 || record.lifecycle_state !== nextState || record.payload?.relationship_id !== relationshipId || record.source_revision !== String(currentRow.record_revision) || event.event_type !== `RELATIONSHIP_${nextState}` || (event.aggregate_id !== undefined && event.aggregate_id !== record.id)) throw new Error("RELATIONSHIP_LIFECYCLE_RECORD_INVALID");
        if (!/^[a-f0-9]{64}$/.test(record.payload?.transition_fingerprint ?? "") || !/^[a-f0-9]{64}$/.test(record.payload?.transition_proof_fingerprint ?? "")) throw new Error("RELATIONSHIP_TRANSITION_PROOF_REQUIRED");
        const unresolved = db.prepare("SELECT i.effect_id,i.state AS intent_state,o.outbox_id,o.state FROM effect_intents i LEFT JOIN outbox o ON o.intent_id=i.effect_id WHERE i.target_id=? AND NOT ((i.state='RECONCILED' AND o.state='delivered') OR (i.state='MANUAL_RECOVERY_REQUIRED' AND o.state='quarantined')) ORDER BY i.effect_id").all(relationshipId);
        if (nextState === "ARCHIVED" && unresolved.length > 0) throw new Error("ARCHIVE_REQUIRES_OUTBOX_DISPOSITION");
        let revocationEpoch = Number(getMeta(db, "revocation_epoch") ?? 0);
        const revoking = nextState === "REVOKED" || nextState === "ARCHIVED";
        if (!revoking && Number(currentPayload.authority_epoch ?? -1) !== revocationEpoch) throw new Error("RELATIONSHIP_AUTHORITY_EPOCH_STALE");
        const expectedAuthorityEpoch = revoking ? Math.max(Number(currentPayload.authority_epoch ?? 0) + 1, revocationEpoch + 1) : Number(currentPayload.authority_epoch ?? 0);
        if (record.payload?.authority_epoch !== expectedAuthorityEpoch) throw new Error("RELATIONSHIP_AUTHORITY_EPOCH_CONFLICT");
        const verificationFingerprint = digest({ current_record_fingerprint: currentRow.content_fp, current_state: expectedState, next_state: nextState, proposed_record: record, event, unresolved_effects: unresolved, locked_revision: expectedRevision });
        const verdict = verifier.verify({ current_record: { ...currentRow, payload: currentPayload }, proposed_record: structuredClone(record), event: structuredClone(event), unresolved_effects: structuredClone(unresolved), fingerprint: verificationFingerprint, locked_revision: expectedRevision, now });
        if (verdict && typeof verdict.then === "function") throw new Error("RELATIONSHIP_LIFECYCLE_ASYNC_VERIFIER_UNSUPPORTED");
        if (verdict?.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== verificationFingerprint || verdict.proof_fingerprint !== record.payload.transition_proof_fingerprint || verdict.proof_fingerprint !== record.policy_fp) throw new Error("RELATIONSHIP_LIFECYCLE_VERIFICATION_FAILED");
        if (revoking) {
          revocationEpoch = expectedAuthorityEpoch;
          setMeta(db, "revocation_epoch", revocationEpoch);
          setMeta(db, `fence:${revocationEpoch}`, { reason: `relationship:${relationshipId}:${nextState}`, at: now });
        }
        if (quarantine) db.prepare("UPDATE outbox SET state='quarantined' WHERE intent_id IN (SELECT effect_id FROM effect_intents WHERE target_id=?) AND state IN ('pending','sending')").run(relationshipId);
        const normalized = normalizeRecord(record, identity, now);
        db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(normalized));
        db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)").run(event.event_id, normalized.id, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? null, event.created_at ?? now);
        setMeta(db, "store_revision", expectedRevision + 1);
        db.exec("COMMIT");
        return { revision: expectedRevision + 1, relationship_id: relationshipId, state: nextState, revocation_epoch: revocationEpoch, quarantined: quarantine ? unresolved.filter((item) => ["pending", "sending"].includes(item.state)).map((item) => item.outbox_id) : [] };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    persistActivationLifecycle({ expectedRevision, authorityEpoch, activationId, expectedMode, nextMode, candidateFingerprint, record, event, verifier }) {
      assertWritable();
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("ACTIVATION_AUTHORITY_EPOCH_REQUIRED");
      if (typeof activationId !== "string" || activationId.length === 0 || !/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "") || !record || record.kind !== "NextWorkflowActivation" || !event) throw new Error("ACTIVATION_LIFECYCLE_INPUT_INVALID");
      if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("ACTIVATION_LIFECYCLE_VERIFIER_REQUIRED");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        if (Number(getMeta(db, "store_revision") ?? 0) !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
        const currentRow = db.prepare("SELECT * FROM records WHERE kind='NextWorkflowActivation' AND lineage_id=? ORDER BY record_revision DESC LIMIT 1").get(activationId);
        const currentPayload = currentRow ? JSON.parse(currentRow.payload_json) : null;
        const currentMode = currentPayload?.mode ?? "planned";
        const currentCandidate = currentPayload?.candidate_fingerprint ?? null;
        if (currentRow && (currentRow.lineage_id !== activationId || currentRow.lifecycle_state !== currentMode || currentPayload?.activation_id !== activationId || currentPayload?.revision !== Number(currentRow.record_revision))) throw new Error("ACTIVATION_CURRENT_RECORD_INVALID");
        if (currentMode !== expectedMode || (currentPayload?.activation_id && currentPayload.activation_id !== activationId)) throw new Error("ACTIVATION_LIFECYCLE_STATE_CONFLICT");
        const candidateRestart = nextMode === "shadow" && currentCandidate && currentCandidate !== candidateFingerprint && !["enforced", "rolled_back"].includes(currentMode);
        if (!candidateRestart && !ACTIVATION_TRANSITIONS.get(currentMode)?.has(nextMode)) throw new Error(`ACTIVATION_LIFECYCLE_TRANSITION_INVALID:${currentMode}:${nextMode}`);
        const previousRevision = Number(currentRow?.record_revision ?? 0);
        const expectedEventType = nextMode === "enforced" ? "NEXT_WORKFLOW_ACTIVATED" : nextMode === "rolled_back" ? "NEXT_WORKFLOW_ROLLED_BACK" : "NEXT_WORKFLOW_ACTIVATION_TRANSITIONED";
        if (record.lineage_id !== activationId || record.lifecycle_state !== nextMode || record.payload?.activation_id !== activationId || record.payload?.mode !== nextMode || record.payload?.candidate_fingerprint !== candidateFingerprint || record.payload?.authority_epoch !== authorityEpoch || record.record_revision !== previousRevision + 1 || record.payload?.revision !== record.record_revision || record.source_revision !== String(previousRevision) || record.input_fp !== candidateFingerprint || !/^[a-f0-9]{64}$/.test(record.policy_fp ?? "") || event.event_type !== expectedEventType || event.aggregate_id !== record.id || event.payload?.activation_id !== activationId || event.payload?.candidate_fingerprint !== candidateFingerprint || event.payload?.authority_epoch !== authorityEpoch) throw new Error("ACTIVATION_LIFECYCLE_RECORD_INVALID");
        if (expectedEventType === "NEXT_WORKFLOW_ACTIVATION_TRANSITIONED" && (event.payload?.from_mode !== currentMode || event.payload?.to_mode !== nextMode || event.payload?.requested_mode !== nextMode)) throw new Error("ACTIVATION_LIFECYCLE_EVENT_INVALID");
        const verificationFingerprint = digest({ current_record_fingerprint: currentRow?.content_fp ?? null, current_mode: currentMode, next_mode: nextMode, candidate_fingerprint: candidateFingerprint, authority_epoch: authorityEpoch, proposed_record: record, event, locked_revision: expectedRevision });
        const verdict = verifier.verify({ current_record: currentRow ? { ...currentRow, payload: currentPayload } : null, proposed_record: structuredClone(record), event: structuredClone(event), fingerprint: verificationFingerprint, locked_revision: expectedRevision, authority_epoch: authorityEpoch, now });
        if (verdict && typeof verdict.then === "function") throw new Error("ACTIVATION_LIFECYCLE_ASYNC_VERIFIER_UNSUPPORTED");
        if (verdict?.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== verificationFingerprint || verdict.proof_fingerprint !== record.policy_fp) throw new Error("ACTIVATION_LIFECYCLE_VERIFICATION_FAILED");
        const normalized = normalizeRecord(record, identity, now);
        db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(normalized));
        db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)").run(event.event_id, normalized.id, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? null, event.created_at ?? now);
        setMeta(db, "store_revision", expectedRevision + 1);
        db.exec("COMMIT");
        return { revision: expectedRevision + 1, activation_id: activationId, mode: nextMode, candidate_fingerprint: candidateFingerprint };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    transitionOutbox({ outboxId, expectedState, nextState, recovery = false }) {
      assertWritable({ recovery });
      if (nextState === "delivered") throw new Error("OUTBOX_DELIVERY_FINALIZER_REQUIRED");
      if (!OUTBOX_TRANSITIONS.get(expectedState)?.has(nextState)) throw new Error("OUTBOX_STATE_TRANSITION_INVALID");
      const result = db.prepare("UPDATE outbox SET state=?,attempts=attempts+? WHERE outbox_id=? AND state=?").run(nextState, nextState === "sending" ? 1 : 0, outboxId, expectedState);
      if (Number(result.changes) !== 1) throw new Error("OUTBOX_STATE_CONFLICT");
      if (recovery) startupRecovery = recoveryState(db);
      return { outbox_id: outboxId, state: nextState };
    },
    finalizeReconciliation({ expectedRevision, effectId, records = [], receipt, events = [], recovery = false }) {
      assertWritable({ recovery });
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("EXPECTED_REVISION_REQUIRED");
      if (api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (!receipt || receipt.intent_id !== effectId || typeof receipt.proof_record_id !== "string" || receipt.proof_record_id.length === 0) throw new Error("RECEIPT_PROOF_RECORD_REQUIRED");
      assertDedicatedRecordWriterKinds(records, { allowEffectReceiptProof: true });
      if (records.length !== 1 || records[0]?.kind !== "EffectReceiptProof") throw new Error("RECONCILIATION_PROOF_RECORD_REQUIRED");
      const proof = records[0];
      if (proof.id !== receipt.proof_record_id || proof.lineage_id !== effectId || proof.lifecycle_state !== "verified" || proof.payload?.effect_id !== effectId || proof.payload?.observation_fingerprint !== receipt.observation_fp || typeof proof.payload?.owner !== "string" || proof.payload.owner.length === 0 || typeof proof.payload?.verifier !== "string" || proof.payload.verifier.length === 0 || proof.payload.owner === proof.payload.verifier || !/^[a-f0-9]{64}$/.test(proof.payload?.effect_identity_fingerprint ?? "") || !/^[a-f0-9]{64}$/.test(proof.payload?.proof_fingerprint ?? "") || proof.input_fp !== proof.payload.proof_fingerprint) throw new Error("RECONCILIATION_PROOF_BINDING_INVALID");
      if (!receiptProofVerifier || receiptProofVerifier.trusted !== true || receiptProofVerifier.independent !== true || typeof receiptProofVerifier.verifier_id !== "string" || receiptProofVerifier.verifier_id.length === 0 || typeof receiptProofVerifier.verify !== "function") throw new Error("RECONCILIATION_PROOF_VERIFIER_REQUIRED");
      if (proof.payload.verifier !== receiptProofVerifier.verifier_id) throw new Error("RECONCILIATION_PROOF_VERIFIER_MISMATCH");
      assertNoRawSecrets({ records, receipt, events });
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        const lockedIntent = db.prepare("SELECT * FROM effect_intents WHERE effect_id=?").get(effectId);
        if (!lockedIntent || lockedIntent.state !== "OBSERVED") throw new Error("EFFECT_STATE_CONFLICT");
        const effectIdentityFingerprint = effectReceiptBindingFingerprint(lockedIntent, receipt);
        if (proof.payload.effect_identity_fingerprint !== effectIdentityFingerprint || proof.policy_fp !== lockedIntent.authority_fp) throw new Error("RECONCILIATION_PROOF_BINDING_INVALID");
        const verificationFingerprint = digest({ effect_id: effectId, intent: lockedIntent, receipt, proof_record: proof, effect_identity_fingerprint: effectIdentityFingerprint, locked_revision: lockedRevision });
        const verdict = receiptProofVerifier.verify({ effect_id: effectId, intent: structuredClone(lockedIntent), receipt: structuredClone(receipt), proof_record: structuredClone(proof), effect_identity_fingerprint: effectIdentityFingerprint, fingerprint: verificationFingerprint, now });
        if (verdict && typeof verdict.then === "function") throw new Error("RECONCILIATION_PROOF_ASYNC_VERIFIER_UNSUPPORTED");
        if (verdict?.verified !== true || verdict.verifier_id !== receiptProofVerifier.verifier_id || verdict.fingerprint !== verificationFingerprint || verdict.proof_fingerprint !== proof.payload.proof_fingerprint) throw new Error("RECONCILIATION_PROOF_VERIFICATION_FAILED");
        const insertRecord = db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const input of records) insertRecord.run(...Object.values(normalizeRecord(input, identity, now)));
        const delivered = db.prepare("UPDATE outbox SET state='delivered' WHERE intent_id=? AND state IN ('pending','sending')").run(effectId);
        if (Number(delivered.changes) !== 1) throw new Error("OUTBOX_DELIVERY_CONFLICT");
        db.prepare("INSERT INTO receipts(receipt_id,intent_id,object_identity,observation_fp,proof_record_id,result,created_at) VALUES(?,?,?,?,?,?,?)").run(receipt.receipt_id, effectId, receipt.object_identity, receipt.observation_fp, receipt.proof_record_id, receipt.result, receipt.created_at ?? now);
        const insertEvent = db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)");
        for (const event of events) insertEvent.run(event.event_id, event.aggregate_id ?? null, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? null, event.created_at ?? now);
        const reconciled = db.prepare("UPDATE effect_intents SET state='RECONCILED' WHERE effect_id=? AND state='OBSERVED'").run(effectId);
        if (Number(reconciled.changes) !== 1) throw new Error("EFFECT_STATE_CONFLICT");
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        if (recovery) startupRecovery = recoveryState(db);
        return { effect_id: effectId, state: "RECONCILED", outbox_state: "delivered", revision: lockedRevision + 1, proof_verifier_id: receiptProofVerifier.verifier_id };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    health({ integrity = "quick" } = {}) {
      assertOpen();
      if (!new Set(["quick", "full"]).has(integrity)) throw new Error("INTEGRITY_MODE_INVALID");
      assertMigrationIdentity(db, identity);
      const pragma = integrity === "quick" ? "quick_check" : "integrity_check";
      const rows = db.prepare(`PRAGMA ${pragma}`).all();
      const values = rows.flatMap((row) => Object.values(row));
      const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
      const pending = db.prepare("SELECT state,COUNT(*) AS count FROM outbox GROUP BY state ORDER BY state").all();
      return { ok: values.every((value) => value === "ok") && foreignKeys.length === 0, integrity, results: values, foreign_key_violations: foreignKeys.length, outbox: pending, revision: api.revision, identity: api.identity, mode: api.mode, recovery_only: api.recovery_only };
    },
    async backup({ destination }) {
      assertWritable();
      const safe = resolveSafePath(root, destination).candidate;
      mkdirSync(dirname(safe), { recursive: true, mode: 0o700 });
      if (existsSync(safe) || existsSync(`${safe}.manifest.json`)) throw new Error("BACKUP_DESTINATION_EXISTS");
      const stagedBackup = randomSibling(safe, "backup");
      const stagedManifest = randomSibling(`${safe}.manifest.json`, "backup-manifest");
      let backupPublished = false;
      try {
        await sqliteBackup(db, stagedBackup);
        const fileDigest = digest(readFileSync(stagedBackup));
        const manifest = { format: "workflow-state-backup-v1", database_digest: fileDigest, identity, schema_version: STORE_SCHEMA_VERSION, source_revision: api.revision, revocation_epoch: api.revocation_epoch, created_at: clock() };
        writeExclusiveFile(stagedManifest, `${canonicalJson(manifest)}\n`);
        renameSync(stagedBackup, safe);
        backupPublished = true;
        renameSync(stagedManifest, `${safe}.manifest.json`);
        fsyncDirectory(dirname(safe));
        return { destination: safe, manifest, manifest_path: `${safe}.manifest.json` };
      } catch (error) {
        if (backupPublished && existsSync(safe) && !existsSync(`${safe}.manifest.json`)) {
          try { renameSync(safe, stagedBackup); } catch {}
        }
        for (const staged of [stagedBackup, stagedManifest]) try { if (existsSync(staged)) unlinkSync(staged); } catch {}
        throw error;
      }
    },
    export({ destination }) {
      assertOpen();
      if (db.prepare("SELECT 1 FROM records WHERE sensitivity='restricted' LIMIT 1").get()) throw new Error("CANONICAL_EXPORT_RESTRICTED_DATA_REQUIRES_SECURE_BACKUP");
      const safe = resolveSafePath(root, destination).candidate;
      mkdirSync(dirname(safe), { recursive: true, mode: 0o700 });
      const sections = ["store_meta", "records", "relations", "events", "effect_intents", "outbox", "receipts", "settings_change_plans", "saga_replay_state", "saga_nonces"];
      const lines = [{ type: "manifest", format: "workflow-state-jsonl-v1", identity, schema_version: STORE_SCHEMA_VERSION, revision: api.revision }];
      for (const table of sections) {
        for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()) lines.push({ type: table, value: row });
      }
      const body = `${lines.map(canonicalJson).join("\n")}\n`;
      writeExclusiveFile(safe, body);
      const manifest = { format: "workflow-state-export-manifest-v1", export_digest: digest(body), records: lines.length - 1, identity, schema_version: STORE_SCHEMA_VERSION, source_revision: api.revision, revocation_epoch: api.revocation_epoch, created_at: clock() };
      writeExclusiveFile(`${safe}.manifest.json`, `${canonicalJson(manifest)}\n`);
      return { destination: safe, manifest };
    },
    rebuild({ projections = ["full_text"] } = {}) {
      assertWritable();
      if (projections.some((item) => item !== "full_text")) throw new Error("PROJECTION_INVALID");
      if (projections.includes("full_text")) {
        db.exec("DELETE FROM full_text_documents");
        const insert = db.prepare("INSERT INTO full_text_documents(record_id,body) VALUES(?,?)");
        for (const row of db.prepare("SELECT id,payload_json FROM records WHERE sensitivity!='restricted' ORDER BY id").all()) insert.run(row.id, row.payload_json);
      }
      return { rebuilt: [...projections] };
    },
    fence({ reason, expectedEpoch, expectedRevision }) {
      assertWritable();
      if (typeof reason !== "string" || reason.length === 0) throw new Error("FENCE_REASON_REQUIRED");
      if (expectedEpoch !== undefined && (!Number.isSafeInteger(expectedEpoch) || expectedEpoch < 0)) throw new Error("FENCE_EXPECTED_EPOCH_INVALID");
      if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw new Error("FENCE_EXPECTED_REVISION_INVALID");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        const lockedEpoch = Number(getMeta(db, "revocation_epoch") ?? 0);
        if (expectedRevision !== undefined && lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (expectedEpoch !== undefined && lockedEpoch !== expectedEpoch) throw new Error("FENCE_EPOCH_CONFLICT");
        const epoch = lockedEpoch + 1;
        setMeta(db, "revocation_epoch", epoch);
        setMeta(db, `fence:${epoch}`, { reason, at: now });
        db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,NULL,'AUTHORITY_FENCED',?,NULL,?)").run(`authority-fence-${epoch}`, canonicalJson({ revocation_epoch: epoch, reason }), now);
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { revocation_epoch: epoch, revision: lockedRevision + 1 };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    close() {
      if (!closed) { db.close(); closed = true; decrementOpenCount(candidate); }
    }
  };
  return api;
}

export function verifyBackupManifest({ backup, manifestPath, expectedIdentity }) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.format !== "workflow-state-backup-v1" || manifest.schema_version !== STORE_SCHEMA_VERSION || !Number.isSafeInteger(manifest.source_revision) || manifest.source_revision < 0 || !Number.isSafeInteger(manifest.revocation_epoch) || manifest.revocation_epoch < 0 || !Number.isFinite(Date.parse(manifest.created_at))) throw new Error("BACKUP_MANIFEST_INVALID");
  if (manifest.database_digest !== digest(readFileSync(backup))) throw new Error("BACKUP_DIGEST_MISMATCH");
  if (canonicalJson(manifest.identity) !== canonicalJson(normalizeIdentity(expectedIdentity))) throw new Error("BACKUP_IDENTITY_MISMATCH");
  return manifest;
}

export function restoreWorkflowStateStore({ repositoryRoot, databasePath, backup, manifestPath, expectedIdentity, stateTransferVerifier }) {
  const { root, candidate } = resolveSafePath(repositoryRoot, databasePath ?? join(realpathSync(repositoryRoot), ".workflow-state", "workflow.sqlite"));
  if ((OPEN_DATABASE_COUNTS.get(candidate) ?? 0) > 0) throw new Error("RESTORE_DESTINATION_OPEN");
  const safeBackup = resolveSafePath(root, backup).candidate;
  const safeManifest = resolveSafePath(root, manifestPath).candidate;
  const identity = normalizeIdentity(expectedIdentity);
  const manifest = verifyBackupManifest({ backup: safeBackup, manifestPath: safeManifest, expectedIdentity: identity });
  if (!Number.isSafeInteger(manifest.source_revision) || manifest.source_revision < 0 || !Number.isSafeInteger(manifest.revocation_epoch) || manifest.revocation_epoch < 0) throw new Error("BACKUP_AUTHORITY_METADATA_INVALID");
  const transferVerification = verifyStateTransferAuthority({ operation: "restore", manifest, contentDigest: manifest.database_digest, identity, verifier: stateTransferVerifier });
  mkdirSync(dirname(candidate), { recursive: true, mode: 0o700 });
  const staged = randomSibling(candidate, "restore");
  if ([staged, `${staged}-wal`, `${staged}-shm`].some((component) => existsSync(component))) throw new Error("RESTORE_STAGING_EXISTS");
  copyFileSync(safeBackup, staged, fsConstants.COPYFILE_EXCL);
  const restored = new DatabaseSync(staged, { allowExtension: false });
  let validationError;
  try {
    restored.exec("PRAGMA foreign_keys=ON");
    const checkpoint = restored.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
    if (Number(checkpoint?.busy ?? 0) !== 0) throw new Error("RESTORE_CHECKPOINT_FAILURE");
    databaseChecks(restored, "RESTORE");
    assertMigrationIdentity(restored, identity, "RESTORE");
    if (Number(getMeta(restored, "store_revision") ?? -1) !== manifest.source_revision || Number(getMeta(restored, "revocation_epoch") ?? -1) !== manifest.revocation_epoch) throw new Error("RESTORE_AUTHORITY_METADATA_MISMATCH");
  } catch (error) {
    validationError = error;
  } finally {
    restored.close();
  }
  if (validationError) {
    for (const component of [staged, `${staged}-wal`, `${staged}-shm`]) {
      try { if (existsSync(component)) unlinkSync(component); } catch {}
    }
    throw validationError;
  }
  for (const suffix of ["-wal", "-shm"]) if (existsSync(`${staged}${suffix}`)) unlinkSync(`${staged}${suffix}`);
  const components = [candidate, `${candidate}-wal`, `${candidate}-shm`].filter((component) => existsSync(component));
  for (const component of components) if (lstatSync(component).isSymbolicLink()) throw new Error("SYMLINK_DATABASE_PATH");
  const quarantineDirectory = components.length > 0 ? randomSibling(candidate, "quarantine") : null;
  const moved = [];
  try {
    if (quarantineDirectory) mkdirSync(quarantineDirectory, { mode: 0o700 });
    for (const component of components) {
      const destination = join(quarantineDirectory, basename(component));
      renameSync(component, destination);
      moved.push({ source: component, destination });
    }
    renameSync(staged, candidate);
    fsyncDirectory(dirname(candidate));
  } catch (error) {
    let rollbackFailed = false;
    for (const item of moved.reverse()) {
      try { if (existsSync(item.destination) && !existsSync(item.source)) renameSync(item.destination, item.source); } catch { rollbackFailed = true; }
    }
    try { if (existsSync(staged)) unlinkSync(staged); } catch { rollbackFailed = true; }
    if (rollbackFailed) throw new Error(`RESTORE_QUARANTINE_ROLLBACK_FAILED:${error.message}`);
    throw error;
  }
  return { restored: candidate, size: statSync(candidate).size, quarantine: quarantineDirectory, transfer_verification: transferVerification };
}

function readBoundedStateFile(file, { maxBytes = 64 * 1024 * 1024 } = {}) {
  const stats = statSync(file);
  if (!stats.isFile() || stats.size > maxBytes) throw new Error("STATE_IMPORT_FILE_INVALID");
  return readFileSync(file, "utf8");
}

function insertExportRow(db, table, row) {
  assertPlainObject(row, "STATE_IMPORT_ROW_INVALID");
  const allowedColumns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
  const columns = Object.keys(row);
  if (columns.length === 0 || columns.some((column) => !allowedColumns.has(column))) throw new Error(`STATE_IMPORT_COLUMN_INVALID:${table}`);
  db.prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`).run(...columns.map((column) => row[column]));
}

export function importWorkflowStateStore({ repositoryRoot, databasePath, exportPath, manifestPath, expectedIdentity, maxBytes, stateTransferVerifier } = {}) {
  const { root, candidate } = resolveSafePath(repositoryRoot, databasePath ?? join(realpathSync(repositoryRoot), ".workflow-state", "workflow.sqlite"));
  if ((OPEN_DATABASE_COUNTS.get(candidate) ?? 0) > 0) throw new Error("IMPORT_DESTINATION_OPEN");
  if (existsSync(candidate)) throw new Error("IMPORT_DESTINATION_EXISTS");
  const safeExport = resolveSafePath(root, exportPath).candidate;
  const body = readBoundedStateFile(safeExport, { maxBytes });
  if (!manifestPath) throw new Error("STATE_IMPORT_MANIFEST_REQUIRED");
  const safeManifest = resolveSafePath(root, manifestPath).candidate;
  const transferManifest = JSON.parse(readBoundedStateFile(safeManifest, { maxBytes: 1024 * 1024 }));
  if (transferManifest.format !== "workflow-state-export-manifest-v1" || transferManifest.schema_version !== STORE_SCHEMA_VERSION || transferManifest.export_digest !== digest(body) || !Number.isSafeInteger(transferManifest.records) || transferManifest.records < 0 || !Number.isSafeInteger(transferManifest.source_revision) || transferManifest.source_revision < 0 || !Number.isSafeInteger(transferManifest.revocation_epoch) || transferManifest.revocation_epoch < 0 || !Number.isFinite(Date.parse(transferManifest.created_at))) throw new Error("STATE_IMPORT_MANIFEST_INVALID");
  const lines = body.split(/\r?\n/).filter((line) => line.length > 0).map((line) => JSON.parse(line));
  const manifest = lines.shift();
  const identity = normalizeIdentity(expectedIdentity);
  if (manifest?.type !== "manifest" || manifest.format !== "workflow-state-jsonl-v1" || manifest.schema_version !== STORE_SCHEMA_VERSION || canonicalJson(manifest.identity) !== canonicalJson(identity)) throw new Error("STATE_IMPORT_IDENTITY_OR_FORMAT_INVALID");
  if (canonicalJson(transferManifest.identity) !== canonicalJson(identity) || transferManifest.source_revision !== manifest.revision || transferManifest.records !== lines.length) throw new Error("STATE_IMPORT_MANIFEST_INVALID");
  const transferVerification = verifyStateTransferAuthority({ operation: "import", manifest: transferManifest, contentDigest: transferManifest.export_digest, identity, verifier: stateTransferVerifier });
  const allowedTables = new Set(["store_meta", "records", "relations", "events", "effect_intents", "outbox", "receipts", "settings_change_plans", "saga_replay_state", "saga_nonces"]);
  if (lines.some((line) => !allowedTables.has(line?.type) || !line.value || typeof line.value !== "object" || Array.isArray(line.value))) throw new Error("STATE_IMPORT_SECTION_INVALID");
  assertNoRawSecrets(lines);
  mkdirSync(dirname(candidate), { recursive: true, mode: 0o700 });
  const staged = randomSibling(candidate, "import");
  const initialized = openWorkflowStateStore({ repositoryRoot: root, databasePath: staged, expectedIdentity: identity });
  initialized.close();
  const imported = new DatabaseSync(staged, { allowExtension: false });
  let failure;
  try {
    configure(imported);
    imported.exec("BEGIN IMMEDIATE");
    for (const table of ["full_text_documents", "saga_nonces", "saga_replay_state", "receipts", "outbox", "effect_intents", "relations", "events", "settings_change_plans", "records", "store_meta"]) imported.exec(`DELETE FROM ${table}`);
    for (const line of lines) insertExportRow(imported, line.type, line.value);
    imported.exec("COMMIT");
    assertMigrationIdentity(imported, identity, "IMPORT");
    databaseChecks(imported, "IMPORT");
    if (Number(getMeta(imported, "store_revision") ?? -1) !== transferManifest.source_revision || Number(getMeta(imported, "revocation_epoch") ?? -1) !== transferManifest.revocation_epoch) throw new Error("IMPORT_AUTHORITY_METADATA_MISMATCH");
    const importedRecovery = recoveryState(imported);
    if (importedRecovery.required) throw new Error("IMPORT_REQUIRES_EFFECT_RECOVERY");
  } catch (error) {
    failure = error;
    try { imported.exec("ROLLBACK"); } catch {}
  } finally {
    imported.close();
  }
  if (failure) {
    for (const component of [staged, `${staged}-wal`, `${staged}-shm`]) try { if (existsSync(component)) unlinkSync(component); } catch {}
    throw failure;
  }
  renameSync(staged, candidate);
  fsyncDirectory(dirname(candidate));
  return { imported: candidate, records: lines.length, identity, transfer_verification: transferVerification };
}

export function readLegacyTsvState({ repositoryRoot, source, requiredColumns = [], maxBytes = 8 * 1024 * 1024 } = {}) {
  const { root } = resolveSafePath(repositoryRoot, repositoryRoot, { allowOutsideStateDirectory: true });
  const file = resolveSafePath(root, source, { allowOutsideStateDirectory: true }).candidate;
  const rows = readBoundedStateFile(file, { maxBytes }).split(/\r?\n/).filter((line) => line.length > 0);
  if (rows.length === 0) throw new Error("LEGACY_TSV_EMPTY");
  const headers = rows.shift().split("\t");
  if (headers.some((header) => header.length === 0) || new Set(headers).size !== headers.length || requiredColumns.some((column) => !headers.includes(column))) throw new Error("LEGACY_TSV_HEADER_INVALID");
  const values = rows.map((line, index) => {
    const cells = line.split("\t");
    if (cells.length !== headers.length) throw new Error(`LEGACY_TSV_ROW_INVALID:${index + 2}`);
    return Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
  });
  assertNoRawSecrets(values);
  return { format: "legacy-tsv-v1", source: relative(root, file), headers, rows: values, fingerprint: digest(values) };
}

export function readLegacyJsonlState({ repositoryRoot, source, maxBytes = 8 * 1024 * 1024 } = {}) {
  const { root } = resolveSafePath(repositoryRoot, repositoryRoot, { allowOutsideStateDirectory: true });
  const file = resolveSafePath(root, source, { allowOutsideStateDirectory: true }).candidate;
  const rows = readBoundedStateFile(file, { maxBytes }).split(/\r?\n/).filter((line) => line.length > 0).map((line, index) => {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`LEGACY_JSONL_ROW_INVALID:${index + 1}`);
    return parsed;
  });
  assertNoRawSecrets(rows);
  return { format: "legacy-jsonl-v1", source: relative(root, file), rows, fingerprint: digest(rows) };
}

export function importLegacyRecords({ store, adapterId, legacyState, mapRecord, authorityScope, policyFingerprint, sourceRevision = "legacy-import" } = {}) {
  if (!store || typeof store.commit !== "function" || typeof store.revision !== "number") throw new Error("LEGACY_IMPORT_STORE_REQUIRED");
  if (typeof adapterId !== "string" || adapterId.length === 0) throw new Error("LEGACY_IMPORT_ADAPTER_REQUIRED");
  if (!legacyState || !Array.isArray(legacyState.rows) || typeof mapRecord !== "function") throw new Error("LEGACY_IMPORT_INPUT_REQUIRED");
  const records = legacyState.rows.flatMap((row, index) => {
    const mapped = mapRecord(structuredClone(row), index);
    return Array.isArray(mapped) ? mapped : [mapped];
  });
  const importFingerprint = digest({ adapter_id: adapterId, source: legacyState.source, source_fingerprint: legacyState.fingerprint, records: records.map((record) => record?.id) });
  const committed = store.commit({
    expectedRevision: store.revision,
    records: records.map((record) => ({ ...record, authority_scope: record.authority_scope ?? authorityScope, source_revision: record.source_revision ?? sourceRevision, policy_fp: record.policy_fp ?? policyFingerprint, input_fp: record.input_fp ?? legacyState.fingerprint })),
    events: [{ event_id: `legacy-import-${importFingerprint.slice(0, 24)}`, event_type: "LEGACY_STATE_IMPORTED", payload: { adapter_id: adapterId, source: legacyState.source, source_fingerprint: legacyState.fingerprint, imported_records: records.length } }]
  });
  return { adapter_id: adapterId, imported_records: records.length, import_fingerprint: importFingerprint, store_revision: committed.revision };
}
