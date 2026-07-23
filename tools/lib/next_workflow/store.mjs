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
import { assertProtectedRuntimeVerifier, protectedRuntimeVerifierFingerprint, protectedRuntimeVerifierTrustFingerprint } from "./runtime_trust.mjs";
import { assertNoSecretMaterial } from "./secret_policy.mjs";
import { assertProtectedRunLifecycleWriter } from "./run_lifecycle.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = [
  { version: 1, name: "initial", path: join(MODULE_DIR, "migrations", "001_initial.sql") },
  { version: 2, name: "saga-replay-and-intent-time", path: join(MODULE_DIR, "migrations", "002_saga_replay.sql") },
  { version: 3, name: "runtime-wiring", path: join(MODULE_DIR, "migrations", "003_runtime_wiring.sql") }
];
const STORE_SCHEMA_VERSION = MIGRATIONS.at(-1).version;
const OPEN_DATABASE_COUNTS = new Map();
const PROTECTED_WORKFLOW_STATE_STORES = new WeakSet();
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
const RUNTIME_RUN_TRANSITIONS = new Map([
  ["STARTING", new Set(["RUNNING", "TERMINATING", "FAILED", "UNKNOWN"])],
  ["RUNNING", new Set(["CANCELLING", "TERMINATING", "COMPLETED", "FAILED", "TIMED_OUT", "UNKNOWN"])],
  ["CANCELLING", new Set(["CANCELLED", "TERMINATING", "UNKNOWN"])],
  ["TERMINATING", new Set(["CANCELLED", "TIMED_OUT", "FAILED", "UNKNOWN"])],
  ["UNKNOWN", new Set(["RUNNING", "COMPLETED", "FAILED", "CANCELLED", "CONFLICT"])],
  ["CONFLICT", new Set()],
  ["COMPLETED", new Set()],
  ["FAILED", new Set()],
  ["CANCELLED", new Set()],
  ["TIMED_OUT", new Set()]
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
const AGENT_LIFECYCLE_RECORD_KINDS = new Set(["AgentRun", "AgentResultCandidate", "AgentResult", "AgentRunClosure"]);
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

function runtimeApprovalBindingFingerprint(approval) {
  return digest({
    reason: approval.reason,
    approval_id: approval.approval_id,
    repository_logical_id: approval.repository_logical_id,
    checkout_instance_id: approval.checkout_instance_id,
    task_id: approval.task_id,
    run_id: approval.run_id,
    operation: approval.operation,
    target_id: approval.target_id,
    request_fingerprint: approval.request_fingerprint,
    policy_revision: approval.policy_revision,
    settings_revision: approval.settings_revision,
    authority_epoch: approval.authority_epoch,
    issued_at: approval.issued_at,
    fresh_until: approval.fresh_until,
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
  if (existsSync(manifestPath) && !existsSync(backup)) throw new Error("MIGRATION_BACKUP_INCOMPLETE");
  const currentMetadata = { identity: getMeta(db, "identity"), source_revision: Number(getMeta(db, "store_revision") ?? 0), revocation_epoch: Number(getMeta(db, "revocation_epoch") ?? 0) };
  function inspectBackup(file) {
    const snapshot = new DatabaseSync(file, { readOnly: true, allowExtension: false });
    try {
      databaseChecks(snapshot, "MIGRATION_BACKUP");
      const versions = snapshot.prepare("SELECT version,state FROM schema_migrations ORDER BY version").all();
      if (versions.length === 0 || Math.max(...versions.map((row) => Number(row.version))) !== fromVersion || versions.some((row) => row.state !== "applied")) throw new Error("MIGRATION_BACKUP_SCHEMA_MISMATCH");
      return { identity: getMeta(snapshot, "identity"), source_revision: Number(getMeta(snapshot, "store_revision") ?? -1), revocation_epoch: Number(getMeta(snapshot, "revocation_epoch") ?? -1) };
    } finally {
      snapshot.close();
    }
  }
  let backupMetadata = null;
  if (existsSync(backup)) {
    backupMetadata = inspectBackup(backup);
    if (canonicalJson(backupMetadata) !== canonicalJson(currentMetadata)) throw new Error("MIGRATION_BACKUP_AUTHORITY_MISMATCH");
  }
  const manifest = {
    format: "workflow-state-pre-migration-backup-v1",
    database_digest: existsSync(backup) ? digest(readFileSync(backup)) : null,
    identity: backupMetadata?.identity ?? currentMetadata.identity,
    schema_version: fromVersion,
    source_revision: backupMetadata?.source_revision ?? currentMetadata.source_revision,
    revocation_epoch: backupMetadata?.revocation_epoch ?? currentMetadata.revocation_epoch,
    from_schema_version: fromVersion,
    to_schema_version: STORE_SCHEMA_VERSION,
    created_at: clock()
  };
  if (existsSync(backup)) {
    if (existsSync(manifestPath)) {
      const existing = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (existing.format !== manifest.format || existing.schema_version !== fromVersion || existing.from_schema_version !== fromVersion || existing.to_schema_version !== STORE_SCHEMA_VERSION || existing.database_digest !== manifest.database_digest || existing.source_revision !== manifest.source_revision || existing.revocation_epoch !== manifest.revocation_epoch || canonicalJson(existing.identity) !== canonicalJson(manifest.identity)) throw new Error("MIGRATION_BACKUP_CONFLICT");
      return { backup, manifest_path: manifestPath, reused: true };
    }
    writeExclusiveFile(manifestPath, `${canonicalJson(manifest)}\n`, { replace: false });
    fsyncDirectory(dirname(candidate));
    return { backup, manifest_path: manifestPath, recovered_manifest: true };
  }
  const stagedBackup = randomSibling(backup, "pre-migration");
  const stagedManifest = randomSibling(manifestPath, "pre-migration-manifest");
  copyFileSync(candidate, stagedBackup, fsConstants.COPYFILE_EXCL);
  const stagedMetadata = inspectBackup(stagedBackup);
  if (canonicalJson(stagedMetadata) !== canonicalJson(currentMetadata)) throw new Error("MIGRATION_BACKUP_AUTHORITY_MISMATCH");
  manifest.database_digest = digest(readFileSync(stagedBackup));
  writeExclusiveFile(stagedManifest, `${canonicalJson(manifest)}\n`, { replace: false });
  renameSync(stagedBackup, backup);
  renameSync(stagedManifest, manifestPath);
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
  const runs = db.prepare("SELECT run_id,idempotency_key,state,pid,process_group_id,updated_at FROM runtime_runs WHERE state NOT IN ('COMPLETED','FAILED','CANCELLED','TIMED_OUT') ORDER BY run_id").all();
  return { required: intents.length > 0 || outbox.length > 0 || runs.length > 0, intents, outbox, runs };
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

function normalizeRuntimeObservation(observation = {}) {
  assertPlainObject(observation, "RUNTIME_RUN_OBSERVATION_INVALID");
  assertNoRawSecrets(observation);
  const encoded = canonicalJson(observation);
  if (Buffer.byteLength(encoded) > 8 * 1024 * 1024) throw new Error("RUNTIME_RUN_OBSERVATION_TOO_LARGE");
  return encoded;
}

function assertClosedKeys(value, allowed, prefix) {
  assertPlainObject(value, `${prefix}_INVALID`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${prefix}_UNKNOWN_FIELD:${key}`);
}

function normalizeRuntimeRun(run, now) {
  const allowed = new Set(["run_id", "idempotency_key", "plan_fingerprint", "authority_epoch", "fence_fingerprint", "start_nonce", "started_at", "observation"]);
  assertClosedKeys(run, allowed, "RUNTIME_RUN");
  for (const field of ["run_id", "idempotency_key", "plan_fingerprint", "fence_fingerprint", "start_nonce", "started_at"]) if (typeof run[field] !== "string" || run[field].length === 0) throw new Error(`RUNTIME_RUN_FIELD_REQUIRED:${field}`);
  if (!/^[a-f0-9]{64}$/.test(run.plan_fingerprint) || !/^[a-f0-9]{64}$/.test(run.fence_fingerprint)) throw new Error("RUNTIME_RUN_FINGERPRINT_INVALID");
  if (!Number.isSafeInteger(run.authority_epoch) || run.authority_epoch < 0) throw new Error("RUNTIME_RUN_AUTHORITY_EPOCH_INVALID");
  if (!Number.isFinite(Date.parse(run.started_at)) || Date.parse(run.started_at) > Date.parse(now)) throw new Error("RUNTIME_RUN_START_TIME_INVALID");
  return {
    run_id: run.run_id,
    idempotency_key: run.idempotency_key,
    plan_fp: run.plan_fingerprint,
    authority_epoch: run.authority_epoch,
    fence_fp: run.fence_fingerprint,
    state: "STARTING",
    pid: null,
    process_group_id: null,
    start_nonce: run.start_nonce,
    started_at: run.started_at,
    updated_at: now,
    exit_code: null,
    signal: null,
    result_fp: null,
    result_size: null,
    observation_json: normalizeRuntimeObservation(run.observation ?? {})
  };
}

function decodeRuntimeRun(row) {
  return row ? { ...row, observation: JSON.parse(row.observation_json) } : undefined;
}

function assertDedicatedRecordWriterKinds(records, { allowEffectReceiptProof = false, allowAgentLifecycle = false } = {}) {
  if (records.some((record) => record.kind === "Relationship")) throw new Error("RELATIONSHIP_LIFECYCLE_WRITER_REQUIRED");
  if (records.some((record) => record.kind === "NextWorkflowActivation")) throw new Error("ACTIVATION_LIFECYCLE_WRITER_REQUIRED");
  if (records.some((record) => AGENT_AUTHORITY_RECORD_KINDS.has(record.kind))) throw new Error("AGENT_AUTHORITY_RECORD_WRITER_REQUIRED");
  if (!allowAgentLifecycle && records.some((record) => AGENT_LIFECYCLE_RECORD_KINDS.has(record.kind))) throw new Error("AGENT_LIFECYCLE_RECORD_WRITER_REQUIRED");
  if (!allowEffectReceiptProof && records.some((record) => record.kind === "EffectReceiptProof")) throw new Error("RECONCILIATION_PROOF_WRITER_REQUIRED");
}

export function openWorkflowStateStore({ repositoryRoot, databasePath, expectedIdentity, mode = "readwrite", receiptProofVerifier, finalizationFenceVerifier, protectedRuntimeVerifiers = false, clock = () => new Date().toISOString() }) {
  const identity = normalizeIdentity(expectedIdentity);
  if (typeof protectedRuntimeVerifiers !== "boolean") throw new Error("STORE_PROTECTED_RUNTIME_VERIFIER_MODE_INVALID");
  const receiptProofVerifierFingerprint = protectedRuntimeVerifiers ? protectedRuntimeVerifierFingerprint(receiptProofVerifier, "receipt_proof") : null;
  const finalizationFenceVerifierFingerprint = protectedRuntimeVerifiers ? protectedRuntimeVerifierFingerprint(finalizationFenceVerifier, "finalization_fence") : null;
  const receiptRuntimeTrustFingerprint = protectedRuntimeVerifiers ? protectedRuntimeVerifierTrustFingerprint(receiptProofVerifier, "receipt_proof") : null;
  const finalizationRuntimeTrustFingerprint = protectedRuntimeVerifiers ? protectedRuntimeVerifierTrustFingerprint(finalizationFenceVerifier, "finalization_fence") : null;
  if (protectedRuntimeVerifiers && receiptRuntimeTrustFingerprint !== finalizationRuntimeTrustFingerprint) throw new Error("STORE_PROTECTED_RUNTIME_TRUST_MISMATCH");
  const requireProtectedRunLifecycleWriter = (lifecycleWriter) => {
    if (protectedRuntimeVerifiers) assertProtectedRunLifecycleWriter(lifecycleWriter, api);
  };
  const defaultPath = join(realpathSync(repositoryRoot), ".workflow-state", "workflow.sqlite");
  const { root, candidate } = resolveSafePath(repositoryRoot, databasePath ?? defaultPath);
  if (mode !== "readwrite" && mode !== "readonly") throw new Error("STORE_MODE_INVALID");
  if (mode === "readwrite") mkdirSync(dirname(candidate), { recursive: true, mode: 0o700 });
  assertNoExistingSymlink(root, candidate);
  if (mode === "readonly" && !existsSync(candidate)) throw new Error("STORE_NOT_FOUND");
  const db = new DatabaseSync(candidate, { readOnly: mode === "readonly", allowExtension: false });
  let closed = false;
  let startupRecovery = { required: false, intents: [], outbox: [], runs: [] };
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
    let authorityVerifierFingerprint = null;
    if (protectedRuntimeVerifiers) {
      assertProtectedRuntimeVerifier(verifier, "agent_authority");
      if (protectedRuntimeVerifierTrustFingerprint(verifier, "agent_authority") !== receiptRuntimeTrustFingerprint) throw new Error("AGENT_AUTHORITY_RUNTIME_TRUST_MISMATCH");
      authorityVerifierFingerprint = protectedRuntimeVerifierFingerprint(verifier, "agent_authority");
    }
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
      const authorityBinding = protectedRuntimeVerifiers ? { authority_verifier_fingerprint: authorityVerifierFingerprint, authority_trust_fingerprint: receiptRuntimeTrustFingerprint } : {};
      const normalized = normalizeRecord({ ...record, payload: { ...record.payload, authority_id: verifier.authority_id, authority_proof_fingerprint: verdict.proof_fingerprint, ...authorityBinding } }, identity, now);
      db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(normalized));
      db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)").run(event.event_id, event.aggregate_id ?? normalized.id, event.event_type, canonicalJson({ ...(event.payload ?? {}), authority_proof_fingerprint: verdict.proof_fingerprint, ...authorityBinding }), event.authority_decision_id ?? verifier.authority_id, event.created_at ?? now);
      setMeta(db, "store_revision", lockedRevision + 1);
      db.exec("COMMIT");
      return { revision: lockedRevision + 1, record_id: normalized.id, kind: normalized.kind, authority_id: verifier.authority_id, proof_fingerprint: verdict.proof_fingerprint };
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  function validateAgentLifecycleCommit({ authorityEpoch, records, relations = [], events = [] }) {
    if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch !== Number(getMeta(db, "revocation_epoch") ?? 0) || !Array.isArray(records) || !Array.isArray(relations) || !Array.isArray(events)) throw new Error("AGENT_LIFECYCLE_AUTHORITY_REQUIRED");
    if (records.length < 1 || records.some((record) => !AGENT_LIFECYCLE_RECORD_KINDS.has(record.kind))) throw new Error("AGENT_LIFECYCLE_RECORD_SET_INVALID");
    const byKind = new Map(records.map((record) => [record.kind, record]));
    if (byKind.has("AgentRun")) {
      if (byKind.has("AgentResult") || byKind.has("AgentRunClosure") || records.length > 2) throw new Error("AGENT_LIFECYCLE_REPORT_SET_INVALID");
      const run = byKind.get("AgentRun");
      const candidateRecord = byKind.get("AgentResultCandidate") ?? null;
      if (!run || !["RUNNING", "FAILED", "TIMED_OUT", "STOPPED"].includes(run.lifecycle_state) || run.payload?.authority_epoch !== authorityEpoch || typeof run.policy_fp !== "string" || run.policy_fp.length === 0) throw new Error("AGENT_LIFECYCLE_RUN_INVALID");
      if (protectedRuntimeVerifiers && (run.id !== `agent-run-${run.lineage_id}` || run.payload?.intent_id !== run.lineage_id || run.input_fp !== run.payload?.launch_intent_fingerprint)) throw new Error("AGENT_LIFECYCLE_RUN_INTENT_BINDING_INVALID");
      const grant = persistedAgentRecord("DelegationGrant", (record) => record.lifecycle_state === "AUTHORIZED" && record.payload?.fingerprint === run.source_revision && record.payload?.authority_epoch === authorityEpoch);
      if (!grant || grant.policy_fp !== run.policy_fp || Date.parse(grant.fresh_until) < Date.parse(clock())) throw new Error("AGENT_LIFECYCLE_GRANT_INVALID");
      if (candidateRecord) {
        const candidateFingerprint = candidateRecord.payload?.result_fingerprint;
        if (run.lifecycle_state !== "RUNNING" || run.payload?.result_candidate_record_id !== candidateRecord.id || run.payload?.lifecycle_run_id !== candidateRecord.payload?.lifecycle_run_id || candidateRecord.lifecycle_state !== "REPORTED" || candidateRecord.lineage_id !== run.id || candidateRecord.policy_fp !== run.policy_fp || candidateRecord.source_revision !== candidateFingerprint || candidateRecord.input_fp !== candidateFingerprint || candidateRecord.payload?.accepted !== false || !/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "") || digest(candidateRecord.payload?.result) !== candidateFingerprint || !/^[a-f0-9]{64}$/.test(candidateRecord.payload?.process_identity_fingerprint ?? "") || !candidateRecord.payload?.launch_report || [candidateRecord.payload.launch_report.provider, candidateRecord.payload.launch_report.model, candidateRecord.payload.launch_report.effort].some((value) => typeof value !== "string" || value.length === 0) || candidateRecord.payload.launch_report.effort === "none") throw new Error("AGENT_RESULT_CANDIDATE_RECORD_INVALID");
        const runtimeRun = api.getRuntimeRun({ runId: candidateRecord.payload.lifecycle_run_id });
        if (runtimeRun?.state !== "COMPLETED" || runtimeRun.authority_epoch !== authorityEpoch || runtimeRun.result_fp !== candidateFingerprint || runtimeRun.observation?.process_identity_fingerprint !== candidateRecord.payload.process_identity_fingerprint || canonicalJson(runtimeRun.observation?.launch_report) !== canonicalJson(candidateRecord.payload.launch_report) || digest(runtimeRun.observation?.agent_result) !== candidateFingerprint || candidateRecord.payload.result?.run_id !== runtimeRun.run_id) throw new Error("AGENT_RESULT_CANDIDATE_RUNTIME_PROVENANCE_INVALID");
        if (protectedRuntimeVerifiers) {
          const launchIntentRecord = api.get({ id: `agent-launch-intent-${run.lineage_id}` });
          const launchIntent = api.getIntent(runtimeRun.run_id);
          const launchReceipt = api.getReceipt(runtimeRun.run_id);
          const admissionIntent = api.getIntent(run.payload?.admission_effect_id);
          const admissionReceipt = api.getReceipt(run.payload?.admission_effect_id);
          const grantRecordId = `delegation-grant-${grant.payload?.grant_id}`;
          if (launchIntentRecord?.kind !== "AgentLaunchIntent" || launchIntentRecord.lifecycle_state !== "PREPARED" || launchIntentRecord.lineage_id !== run.lineage_id || launchIntentRecord.payload?.intent_id !== run.lineage_id || launchIntentRecord.payload?.fingerprint !== run.input_fp || launchIntentRecord.payload?.fingerprint !== run.payload?.launch_intent_fingerprint || launchIntentRecord.payload?.grant_record_id !== grantRecordId || launchIntentRecord.payload?.grant_fingerprint !== grant.payload?.fingerprint || launchIntentRecord.payload?.provider_plan_fingerprint !== runtimeRun.plan_fp || launchIntentRecord.source_revision !== grant.payload?.fingerprint || launchIntentRecord.policy_fp !== run.policy_fp) throw new Error("AGENT_RESULT_CANDIDATE_LAUNCH_INTENT_PROVENANCE_INVALID");
          if (candidateRecord.id !== `agent-result-candidate-${run.id}` || launchIntent?.state !== "RECONCILED" || launchIntent.effect_id !== runtimeRun.run_id || launchIntent.operation !== "agent_launch:spawn" || launchIntent.authority_epoch !== authorityEpoch || launchIntent.policy_revision !== run.policy_fp || launchIntent.request_fp !== launchIntentRecord.payload?.launch_request_fingerprint || !/^[a-f0-9]{64}$/.test(launchIntentRecord.payload?.launch_request_fingerprint ?? "") || !launchReceipt || launchReceipt.intent_id !== launchIntent.effect_id || launchReceipt.receipt_id !== `receipt-${launchIntent.effect_id}` || admissionIntent?.state !== "RECONCILED" || admissionIntent.operation !== "agent_run_admission:admit" || admissionIntent.target_id !== run.lineage_id || admissionIntent.authority_epoch !== authorityEpoch || admissionIntent.policy_revision !== run.policy_fp || admissionIntent.request_fp !== digest({ attestation_fingerprint: run.payload?.attestation_fingerprint }) || !admissionReceipt || admissionReceipt.intent_id !== admissionIntent.effect_id || admissionReceipt.receipt_id !== run.payload?.admission_receipt_id || admissionReceipt.receipt_id !== `receipt-${admissionIntent.effect_id}`) throw new Error("AGENT_RESULT_CANDIDATE_ADMISSION_PROVENANCE_INVALID");
        }
        const expectedStates = ["PLANNED", "AUTHORIZED", "STARTING", "RUNNING"];
        if (canonicalJson(run.payload?.state_history) !== canonicalJson(expectedStates) || relations.length !== 1 || relations[0]?.from_id !== run.id || relations[0]?.relation_kind !== "reported_candidate" || relations[0]?.to_id !== candidateRecord.id || events.length !== expectedStates.length + 1) throw new Error("AGENT_RESULT_CANDIDATE_TOPOLOGY_INVALID");
        for (let index = 0; index < expectedStates.length; index += 1) {
          const state = expectedStates[index];
          const event = events[index];
          const expectedAuthorityDecision = protectedRuntimeVerifiers && ["AUTHORIZED", "RUNNING"].includes(state) ? api.getIntent(run.payload.admission_effect_id)?.authority_fp : null;
          if (event?.event_id !== `event-${run.id}-${index + 1}` || event.aggregate_id !== run.id || event.event_type !== `AGENT_RUN_${state}` || event.payload?.state !== state || event.payload?.launch_effect_id !== runtimeRun.run_id || (protectedRuntimeVerifiers && (event.authority_decision_id !== expectedAuthorityDecision || event.payload?.admission_effect_id !== run.payload?.admission_effect_id || event.payload?.admission_receipt_id !== run.payload?.admission_receipt_id))) throw new Error("AGENT_RESULT_CANDIDATE_EVENT_INVALID");
        }
        const reportEvent = events.at(-1);
        if (reportEvent?.event_id !== `event-${candidateRecord.id}` || reportEvent.aggregate_id !== run.id || reportEvent.event_type !== "AGENT_RESULT_CANDIDATE_REPORTED" || (protectedRuntimeVerifiers && reportEvent.authority_decision_id !== api.getIntent(run.payload?.admission_effect_id)?.authority_fp) || reportEvent.payload?.result_candidate_record_id !== candidateRecord.id || reportEvent.payload?.result_fingerprint !== candidateFingerprint || reportEvent.payload?.review_required !== true) throw new Error("AGENT_RESULT_CANDIDATE_EVENT_INVALID");
      } else if (run.payload?.result_candidate_record_id) throw new Error("AGENT_RESULT_CANDIDATE_RECORD_REQUIRED");
      return;
    }
    if (records.length !== 2 || !byKind.has("AgentResult") || !byKind.has("AgentRunClosure")) throw new Error("AGENT_LIFECYCLE_CLOSURE_SET_INVALID");
    const result = byKind.get("AgentResult");
    const closure = byKind.get("AgentRunClosure");
    const run = api.get({ id: result.lineage_id });
    const candidateRecord = run?.payload?.result_candidate_record_id ? api.get({ id: run.payload.result_candidate_record_id }) : null;
    const candidateFingerprint = candidateRecord?.payload?.result_fingerprint;
    if (run?.kind !== "AgentRun" || run.lifecycle_state !== "RUNNING" || run.payload?.authority_epoch !== authorityEpoch || candidateRecord?.kind !== "AgentResultCandidate" || candidateRecord.lifecycle_state !== "REPORTED" || result.lifecycle_state !== "accepted" || closure.lifecycle_state !== "CLOSED" || closure.lineage_id !== run.id || result.payload?.candidate_record_id !== candidateRecord.id || result.payload?.candidate_result_fingerprint !== candidateFingerprint || closure.payload?.result_candidate_record_id !== candidateRecord.id || closure.payload?.candidate_result_fingerprint !== candidateFingerprint || closure.payload?.result_id !== result.id || result.source_revision !== candidateRecord.id || closure.source_revision !== candidateRecord.id || result.policy_fp !== run.policy_fp || closure.policy_fp !== run.policy_fp || closure.payload?.authority_epoch !== authorityEpoch || canonicalJson(closure.payload?.state_history) !== canonicalJson(["REPORTED", "REVIEWED", "CLOSED"])) throw new Error("AGENT_LIFECYCLE_CLOSURE_BINDING_INVALID");
    if (!/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "") || digest(candidateRecord.payload?.result) !== candidateFingerprint || result.payload?.provenance?.source_fingerprint !== candidateFingerprint) throw new Error("AGENT_LIFECYCLE_RESULT_PROVENANCE_INVALID");
    const assignmentIds = closure.payload?.reviewer_assignment_ids;
    const reviewIds = closure.payload?.review_record_ids;
    const roles = ["lead", "orchestrator", "validator"];
    const exactRoleMap = (value) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join("\0") === roles.slice().sort().join("\0") && Object.values(value).every((id) => typeof id === "string" && id.length > 0);
    if (!exactRoleMap(assignmentIds) || !exactRoleMap(reviewIds)) throw new Error("AGENT_LIFECYCLE_REVIEW_TOPOLOGY_INVALID");
    for (const role of roles) {
      if (assignmentIds[role] !== `agent-reviewer-assignment-${run.id}-${role}` || reviewIds[role] !== `agent-review-${run.id}-${role}`) throw new Error("AGENT_LIFECYCLE_REVIEW_TOPOLOGY_INVALID");
    }
    const grant = persistedAgentRecord("DelegationGrant", (record) => record.lifecycle_state === "AUTHORIZED" && record.payload?.fingerprint === run.source_revision && record.payload?.authority_epoch === authorityEpoch);
    if (!grant || grant.policy_fp !== run.policy_fp || Date.parse(grant.fresh_until) < Date.parse(clock())) throw new Error("AGENT_LIFECYCLE_GRANT_INVALID");
    const assignmentKinds = { lead: ["Value Design Lead", "Planning Design Lead", "Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"], orchestrator: ["Orchestrator Agent"], validator: ["Safety and Acceptance Decision Lead"] };
    const reviewKinds = { lead: "AgentLeadReview", orchestrator: "AgentOrchestratorReview", validator: "AgentValidatorDisposition" };
    const resultReviewFields = { lead: "lead_review", orchestrator: "orchestrator_review", validator: "validator_disposition" };
    const closureReviewFields = { lead: "lead_review_fingerprint", orchestrator: "orchestrator_review_fingerprint", validator: "validator_disposition_fingerprint" };
    const evidenceFingerprint = digest({ run_id: result.payload?.run_id, candidate_record_id: result.payload?.candidate_record_id, provenance: result.payload?.provenance, scope_fingerprint: result.payload?.scope_fingerprint, conclusion: result.payload?.conclusion ?? null, evidence_references: result.payload?.evidence_references ?? [], changed_artifact_manifest: result.payload?.changed_artifact_manifest ?? [], unresolved_items: result.payload?.unresolved_items ?? [] });
    if (result.payload?.run_id !== run.id || result.payload?.evidence_fingerprint !== evidenceFingerprint) throw new Error("AGENT_LIFECYCLE_RESULT_EVIDENCE_INVALID");
    const assignedAgents = [];
    for (const role of roles) {
      const assignment = api.get({ id: assignmentIds[role] });
      const review = api.get({ id: reviewIds[role] });
      if (assignment?.kind !== "AgentReviewerAssignment" || assignment.lifecycle_state !== "AUTHORIZED" || assignment.lineage_id !== run.id || assignment.source_revision !== grant.payload.fingerprint || assignment.policy_fp !== run.policy_fp || Date.parse(assignment.fresh_until) < Date.parse(clock()) || assignment.payload?.run_id !== run.id || assignment.payload?.assignment_kind !== role || assignment.payload?.grant_fingerprint !== grant.payload.fingerprint || assignment.payload?.authority_epoch !== authorityEpoch || assignment.payload?.read_only !== true || !assignmentKinds[role].includes(assignment.payload?.agent_role) || typeof assignment.payload?.authority_proof_fingerprint !== "string" || (protectedRuntimeVerifiers && (assignment.payload?.authority_trust_fingerprint !== receiptRuntimeTrustFingerprint || !/^[a-f0-9]{64}$/.test(assignment.payload?.authority_verifier_fingerprint ?? "")))) throw new Error("AGENT_LIFECYCLE_REVIEWER_ASSIGNMENT_INVALID");
      assignedAgents.push(assignment.payload.agent_id);
      const reviewPayload = result.payload?.[resultReviewFields[role]];
      if (review?.kind !== reviewKinds[role] || review.lifecycle_state !== "accepted" || review.lineage_id !== run.id || review.source_revision !== assignment.id || review.policy_fp !== run.policy_fp || Date.parse(review.fresh_until) < Date.parse(clock()) || review.payload?.assignment_kind !== role || review.payload?.agent_id !== assignment.payload.agent_id || review.payload?.assignment_fingerprint !== digest(assignment.payload) || review.payload?.authority_epoch !== authorityEpoch || review.payload?.accepted !== true || review.payload?.result_fingerprint !== evidenceFingerprint || typeof review.payload?.authority_proof_fingerprint !== "string" || (protectedRuntimeVerifiers && (review.payload?.authority_trust_fingerprint !== receiptRuntimeTrustFingerprint || !/^[a-f0-9]{64}$/.test(review.payload?.authority_verifier_fingerprint ?? ""))) || (role === "validator" && review.payload?.decision !== "PASS") || canonicalJson(reviewPayload) !== canonicalJson(review.payload) || closure.payload?.[closureReviewFields[role]] !== digest(review.payload)) throw new Error("AGENT_LIFECYCLE_REVIEW_RECORD_INVALID");
    }
    if (new Set(assignedAgents).size !== roles.length || assignedAgents.includes(grant.payload.child_agent_id)) throw new Error("AGENT_LIFECYCLE_REVIEWER_INDEPENDENCE_INVALID");
    const authoritativeResult = structuredClone(result.payload);
    delete authoritativeResult.candidate_result_fingerprint;
    delete authoritativeResult.evidence_fingerprint;
    delete authoritativeResult.validator_disposition_fingerprint;
    const authoritativeResultFingerprint = digest(authoritativeResult);
    if (result.input_fp !== authoritativeResultFingerprint || closure.input_fp !== authoritativeResultFingerprint || result.payload.validator_disposition_fingerprint !== digest(result.payload.validator_disposition)) throw new Error("AGENT_LIFECYCLE_RESULT_FINGERPRINT_INVALID");
    const expectedRelations = [{ from_id: run.id, relation_kind: "produced_result", to_id: result.id }, { from_id: result.id, relation_kind: "closed_by", to_id: closure.id }];
    if (canonicalJson(relations) !== canonicalJson(expectedRelations)) throw new Error("AGENT_LIFECYCLE_RELATION_TOPOLOGY_INVALID");
    const expectedEvents = ["REPORTED", "REVIEWED", "CLOSED"].map((state, index) => ({ event_id: `event-${closure.id}-${index + 1}`, aggregate_id: run.id, event_type: `AGENT_RUN_${state}`, payload: { run_id: run.id, result_id: result.id, state, validator_disposition_fingerprint: digest(result.payload.validator_disposition) } }));
    if (canonicalJson(events) !== canonicalJson(expectedEvents)) throw new Error("AGENT_LIFECYCLE_EVENT_TOPOLOGY_INVALID");
  }

  const api = {
    get path() { return candidate; },
    get repository_root() { return root; },
    get identity() { return structuredClone(identity); },
    get receipt_proof_verifier_id() { return receiptProofVerifier?.verifier_id ?? null; },
    get finalization_fence_verifier_id() { return finalizationFenceVerifier?.verifier_id ?? null; },
    get protected_runtime_verifiers() { return protectedRuntimeVerifiers; },
    get receipt_proof_verifier_fingerprint() { return receiptProofVerifierFingerprint; },
    get finalization_fence_verifier_fingerprint() { return finalizationFenceVerifierFingerprint; },
    get runtime_trust_fingerprint() { return receiptRuntimeTrustFingerprint; },
    get mode() { assertOpen(); return mode === "readonly" ? "readonly" : startupRecovery.required ? "recovery-only" : "readwrite"; },
    get recovery_only() { assertOpen(); return startupRecovery.required; },
    get recovery_state() { assertOpen(); return structuredClone(startupRecovery); },
    get revision() { assertOpen(); return Number(getMeta(db, "store_revision") ?? 0); },
    get revocation_epoch() { assertOpen(); return Number(getMeta(db, "revocation_epoch") ?? 0); },
    commit({ expectedRevision, authorityEpoch, records = [], relations = [], events = [], evidenceRefs = [], effectIntent, outboxItem, receipt, settingsPlan, settingsPlanUse, approvalUses = [] } = {}) {
      assertWritable();
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("EXPECTED_REVISION_REQUIRED");
      if (authorityEpoch !== undefined && (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0)) throw new Error("AUTHORITY_EPOCH_INVALID");
      if (Boolean(effectIntent) !== Boolean(outboxItem) || (effectIntent && outboxItem.intent_id !== effectIntent.effect_id)) throw new Error("EFFECT_OUTBOX_ATOMIC_PAIR_REQUIRED");
      if (effectIntent && authorityEpoch === undefined) throw new Error("EFFECT_AUTHORITY_EPOCH_REQUIRED");
      if (!Array.isArray(approvalUses) || (approvalUses.length > 0 && !effectIntent)) throw new Error("RUNTIME_APPROVAL_USE_INVALID");
      assertNoRawSecrets({ records, relations, events, evidenceRefs, effectIntent, outboxItem, receipt, settingsPlan, settingsPlanUse, approvalUses });
      const currentRevision = api.revision;
      if (currentRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (effectIntent) {
        const existingBeforeLock = db.prepare("SELECT * FROM effect_intents WHERE effect_key=?").get(effectIntent.effect_key);
        if (existingBeforeLock) {
          const incomingFingerprint = digest({ request_fp: effectIntent.request_fp, target_id: effectIntent.target_id, operation: effectIntent.operation, expected_selector: effectIntent.expected_selector ?? {}, binding_fp: effectIntent.binding_fingerprint });
          const existingFingerprint = digest({ request_fp: existingBeforeLock.request_fp, target_id: existingBeforeLock.target_id, operation: existingBeforeLock.operation, expected_selector: JSON.parse(existingBeforeLock.expected_selector_json), binding_fp: existingBeforeLock.binding_fp });
          if (incomingFingerprint !== existingFingerprint) {
            api.recordRuntimeConflict({ conflictKind: "effect", idempotencyKey: effectIntent.effect_key, existingId: existingBeforeLock.effect_id, existingFingerprint, incomingFingerprint, details: { target_id: effectIntent.target_id, operation: effectIntent.operation } });
            throw new Error("EFFECT_IDEMPOTENCY_PAYLOAD_CONFLICT");
          }
        }
      }
      assertDedicatedRecordWriterKinds(records);
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (authorityEpoch !== undefined && Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
        if (effectIntent) {
          const existing = db.prepare("SELECT * FROM effect_intents WHERE effect_key=?").get(effectIntent.effect_key);
          if (existing) {
            const same = existing.request_fp === effectIntent.request_fp
              && existing.target_id === effectIntent.target_id
              && existing.operation === effectIntent.operation
              && existing.expected_selector_json === canonicalJson(effectIntent.expected_selector ?? {})
              && existing.binding_fp === effectIntent.binding_fingerprint;
            if (!same) throw new Error("EFFECT_IDEMPOTENCY_PAYLOAD_CONFLICT");
            if (records.length > 0 || relations.length > 0 || events.length > 0 || evidenceRefs.length > 0 || receipt || settingsPlan || settingsPlanUse) throw new Error("EFFECT_IDEMPOTENCY_REUSE_MIXED_COMMIT_FORBIDDEN");
            const existingOutbox = db.prepare("SELECT outbox_id,state FROM outbox WHERE intent_id=?").get(existing.effect_id);
            if (!existingOutbox) throw new Error("EFFECT_IDEMPOTENCY_OUTBOX_MISSING");
            db.exec("COMMIT");
            return { revision: lockedRevision, committed_at: now, reused: true, effect_id: existing.effect_id, intent_state: existing.state, outbox_id: existingOutbox.outbox_id, outbox_state: existingOutbox.state };
          }
        }
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
          if (!Number.isSafeInteger(effectIntent.authority_epoch) || effectIntent.authority_epoch !== authorityEpoch || typeof effectIntent.decision_expires_at !== "string" || !Number.isFinite(Date.parse(effectIntent.decision_expires_at)) || typeof effectIntent.settings_revision !== "string" || typeof effectIntent.policy_revision !== "string" || typeof effectIntent.activation_fp !== "string" || !/^[a-f0-9]{64}$/.test(effectIntent.binding_fingerprint ?? "")) throw new Error("EFFECT_DECISION_FENCE_REQUIRED");
          const approvalIds = [...new Set(effectIntent.approval_ids ?? [])].sort();
          if (approvalIds.length !== approvalUses.length || approvalIds.some((id, index) => id !== [...approvalUses].sort()[index])) throw new Error("RUNTIME_APPROVAL_USE_MISMATCH");
          db.prepare("INSERT INTO effect_intents(effect_id,effect_key,request_fp,authority_fp,target_id,operation,expected_selector_json,attempt_lineage,state,created_at,authority_epoch,decision_expires_at,settings_revision,policy_revision,activation_fp,approval_ids_json,binding_fp) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(effectIntent.effect_id, effectIntent.effect_key, effectIntent.request_fp, effectIntent.authority_fp, effectIntent.target_id, effectIntent.operation, canonicalJson(effectIntent.expected_selector ?? {}), effectIntent.attempt_lineage, effectIntent.state ?? "PREPARED", effectIntent.created_at ?? now, effectIntent.authority_epoch, effectIntent.decision_expires_at, effectIntent.settings_revision, effectIntent.policy_revision, effectIntent.activation_fp, canonicalJson(approvalIds), effectIntent.binding_fingerprint);
          for (const approvalId of approvalIds) {
            const approval = db.prepare("SELECT * FROM runtime_approvals WHERE approval_id=?").get(approvalId);
            if (!approval || approval.state !== "pending" || approval.repository_id !== identity.repository_logical_id || approval.checkout_id !== identity.checkout_instance_id || approval.task_id !== effectIntent.task_id || approval.run_id !== effectIntent.run_id || approval.operation !== effectIntent.operation || approval.target_id !== effectIntent.target_id || approval.request_fp !== effectIntent.request_fp || approval.policy_revision !== effectIntent.policy_revision || approval.settings_revision !== effectIntent.settings_revision || Number(approval.authority_epoch) !== authorityEpoch || Date.parse(approval.expires_at) < Date.parse(now)) throw new Error("RUNTIME_APPROVAL_CONSUMPTION_BINDING_INVALID");
            const consumed = db.prepare("UPDATE runtime_approvals SET state='consumed',consumed_by=?,consumed_at=? WHERE approval_id=? AND state='pending'").run(effectIntent.effect_id, now, approvalId);
            if (Number(consumed.changes) !== 1) throw new Error("RUNTIME_APPROVAL_ALREADY_CONSUMED");
          }
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
        return { revision: lockedRevision + 1, committed_at: now, reused: false, effect_id: effectIntent?.effect_id ?? null };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    commitAgentLifecycle(input = {}) {
      assertWritable();
      validateAgentLifecycleCommit(input);
      const { expectedRevision, authorityEpoch, records = [], relations = [], events = [], evidenceRefs = [] } = input;
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      assertNoRawSecrets({ records, relations, events, evidenceRefs });
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (Number(getMeta(db, "revocation_epoch") ?? 0) !== authorityEpoch) throw new Error("AUTHORITY_EPOCH_STALE");
        const insertRecord = db.prepare(`INSERT INTO records(id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,sensitivity,fresh_until,created_at,superseded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const record of records) insertRecord.run(...Object.values(normalizeRecord(record, identity, now)));
        const insertRelation = db.prepare("INSERT INTO relations(from_id,relation_kind,to_id) VALUES(?,?,?)");
        for (const relation of relations) insertRelation.run(relation.from_id, relation.relation_kind, relation.to_id);
        const insertEvent = db.prepare("INSERT INTO events(event_id,aggregate_id,event_type,payload_json,authority_decision_id,created_at) VALUES(?,?,?,?,?,?)");
        for (const event of events) insertEvent.run(event.event_id, event.aggregate_id ?? null, event.event_type, canonicalJson(event.payload ?? {}), event.authority_decision_id ?? null, event.created_at ?? now);
        for (const evidenceRef of evidenceRefs) if (typeof evidenceRef !== "string" || evidenceRef.length === 0) throw new Error("EVIDENCE_REFERENCE_INVALID");
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { revision: lockedRevision + 1 };
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
    issueRuntimeApproval({ expectedRevision, approval, verifier }) {
      assertWritable();
      assertPlainObject(approval, "RUNTIME_APPROVAL_REQUIRED");
      const requiredStrings = ["reason", "approval_id", "repository_logical_id", "checkout_instance_id", "task_id", "run_id", "operation", "target_id", "request_fingerprint", "policy_revision", "settings_revision", "issued_at", "fresh_until", "proof_fingerprint"];
      for (const field of requiredStrings) if (typeof approval[field] !== "string" || approval[field].length === 0) throw new Error(`RUNTIME_APPROVAL_FIELD_REQUIRED:${field}`);
      if (!Number.isSafeInteger(approval.authority_epoch) || approval.authority_epoch < 0 || !Number.isFinite(Date.parse(approval.issued_at)) || !Number.isFinite(Date.parse(approval.fresh_until)) || Date.parse(approval.issued_at) >= Date.parse(approval.fresh_until)) throw new Error("RUNTIME_APPROVAL_TIME_OR_EPOCH_INVALID");
      if (approval.repository_logical_id !== identity.repository_logical_id || approval.checkout_instance_id !== identity.checkout_instance_id) throw new Error("RUNTIME_APPROVAL_REPOSITORY_BINDING_INVALID");
      if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("RUNTIME_APPROVAL_ISSUER_VERIFIER_REQUIRED");
      if (protectedRuntimeVerifiers) protectedRuntimeVerifierFingerprint(verifier, "approval_issuer");
      if (!Number.isSafeInteger(expectedRevision) || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      const bindingFingerprint = runtimeApprovalBindingFingerprint(approval);
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        const lockedEpoch = Number(getMeta(db, "revocation_epoch") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (lockedEpoch !== approval.authority_epoch) throw new Error("AUTHORITY_EPOCH_STALE");
        if (Date.parse(approval.issued_at) > Date.parse(now) || Date.parse(approval.fresh_until) < Date.parse(now)) throw new Error("RUNTIME_APPROVAL_NOT_CURRENT");
        const verificationFingerprint = digest({ approval, binding_fingerprint: bindingFingerprint, locked_revision: lockedRevision, authority_epoch: lockedEpoch });
        const verdict = verifier.verify({ approval: structuredClone(approval), binding_fingerprint: bindingFingerprint, fingerprint: verificationFingerprint, now });
        if (verdict && typeof verdict.then === "function") throw new Error("RUNTIME_APPROVAL_ASYNC_VERIFIER_UNSUPPORTED");
        if (verdict?.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== verificationFingerprint || verdict.binding_fingerprint !== bindingFingerprint || verdict.proof_fingerprint !== approval.proof_fingerprint) throw new Error("RUNTIME_APPROVAL_ISSUER_VERIFICATION_FAILED");
        db.prepare("INSERT INTO runtime_approvals(approval_id,reason,repository_id,checkout_id,task_id,run_id,operation,target_id,request_fp,policy_revision,settings_revision,authority_epoch,issued_at,expires_at,verifier_id,proof_fp,binding_fp,state,consumed_by,consumed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',NULL,NULL)").run(approval.approval_id, approval.reason, approval.repository_logical_id, approval.checkout_instance_id, approval.task_id, approval.run_id, approval.operation, approval.target_id, approval.request_fingerprint, approval.policy_revision, approval.settings_revision, approval.authority_epoch, approval.issued_at, approval.fresh_until, verifier.verifier_id, approval.proof_fingerprint, bindingFingerprint);
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { approval_id: approval.approval_id, state: "pending", binding_fingerprint: bindingFingerprint, revision: lockedRevision + 1 };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    getRuntimeApproval({ approvalId }) {
      assertOpen();
      if (typeof approvalId !== "string" || approvalId.length === 0) throw new Error("RUNTIME_APPROVAL_ID_REQUIRED");
      const row = db.prepare("SELECT * FROM runtime_approvals WHERE approval_id=?").get(approvalId);
      return row ? { ...row } : undefined;
    },
    runtimeApprovalVerifier() {
      assertOpen();
      return Object.freeze({
        trusted: true,
        independent: true,
        verifier_id: "workflow-state-runtime-approval",
        verify({ approval, binding_fingerprint: bindingFingerprint, decision_time: decisionTime }) {
          const row = db.prepare("SELECT * FROM runtime_approvals WHERE approval_id=?").get(approval?.approval_id);
          if (!row || row.state !== "pending" || row.binding_fp !== bindingFingerprint || row.proof_fp !== approval?.proof_fingerprint || Date.parse(row.expires_at) < Date.parse(decisionTime)) return { verified: false };
          const reconstructed = {
            reason: row.reason,
            approval_id: row.approval_id,
            repository_logical_id: row.repository_id,
            checkout_instance_id: row.checkout_id,
            task_id: row.task_id,
            run_id: row.run_id,
            operation: row.operation,
            target_id: row.target_id,
            request_fingerprint: row.request_fp,
            policy_revision: row.policy_revision,
            settings_revision: row.settings_revision,
            authority_epoch: Number(row.authority_epoch),
            issued_at: row.issued_at,
            fresh_until: row.expires_at,
            proof_fingerprint: row.proof_fp,
          };
          if (canonicalJson(reconstructed) !== canonicalJson(approval) || runtimeApprovalBindingFingerprint(reconstructed) !== bindingFingerprint) return { verified: false };
          return { verified: true, verifier_id: "workflow-state-runtime-approval", approval_id: row.approval_id, proof_fingerprint: row.proof_fp, binding_fingerprint: row.binding_fp };
        },
      });
    },
    createRuntimeRun({ expectedRevision, run, lifecycleWriter }) {
      assertWritable();
      requireProtectedRunLifecycleWriter(lifecycleWriter);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      const now = clock();
      const normalized = normalizeRuntimeRun(run, now);
      const existingBeforeLock = db.prepare("SELECT * FROM runtime_runs WHERE idempotency_key=? OR run_id=? ORDER BY run_id LIMIT 1").get(normalized.idempotency_key, normalized.run_id);
      if (existingBeforeLock) {
        const existingFingerprint = digest({ run_id: existingBeforeLock.run_id, idempotency_key: existingBeforeLock.idempotency_key, plan_fp: existingBeforeLock.plan_fp, authority_epoch: Number(existingBeforeLock.authority_epoch), fence_fp: existingBeforeLock.fence_fp, start_nonce: existingBeforeLock.start_nonce });
        const incomingFingerprint = digest({ run_id: normalized.run_id, idempotency_key: normalized.idempotency_key, plan_fp: normalized.plan_fp, authority_epoch: normalized.authority_epoch, fence_fp: normalized.fence_fp, start_nonce: normalized.start_nonce });
        if (existingFingerprint !== incomingFingerprint) {
          api.recordRuntimeConflict({ conflictKind: "runtime_run", idempotencyKey: normalized.idempotency_key, existingId: existingBeforeLock.run_id, existingFingerprint, incomingFingerprint, details: { requested_run_id: normalized.run_id } });
          throw new Error("RUNTIME_RUN_IDEMPOTENCY_CONFLICT");
        }
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        const lockedEpoch = Number(getMeta(db, "revocation_epoch") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        if (lockedEpoch !== normalized.authority_epoch) throw new Error("AUTHORITY_EPOCH_STALE");
        const existing = db.prepare("SELECT * FROM runtime_runs WHERE idempotency_key=? OR run_id=? ORDER BY run_id LIMIT 1").get(normalized.idempotency_key, normalized.run_id);
        if (existing) {
          const same = existing.run_id === normalized.run_id
            && existing.idempotency_key === normalized.idempotency_key
            && existing.plan_fp === normalized.plan_fp
            && Number(existing.authority_epoch) === normalized.authority_epoch
            && existing.fence_fp === normalized.fence_fp
            && existing.start_nonce === normalized.start_nonce;
          if (!same) throw new Error("RUNTIME_RUN_IDEMPOTENCY_CONFLICT");
          db.exec("COMMIT");
          return { revision: lockedRevision, reused: true, run: decodeRuntimeRun(existing) };
        }
        db.prepare("INSERT INTO runtime_runs(run_id,idempotency_key,plan_fp,authority_epoch,fence_fp,state,pid,process_group_id,start_nonce,started_at,updated_at,exit_code,signal,result_fp,result_size,observation_json) VALUES(?,?,?,?,?,'STARTING',NULL,NULL,?,?,?,NULL,NULL,NULL,NULL,?)").run(normalized.run_id, normalized.idempotency_key, normalized.plan_fp, normalized.authority_epoch, normalized.fence_fp, normalized.start_nonce, normalized.started_at, normalized.updated_at, normalized.observation_json);
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { revision: lockedRevision + 1, reused: false, run: decodeRuntimeRun(db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(normalized.run_id)) };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    bindRuntimeProcess({ expectedRevision, runId, pid, processGroupId, processIdentityFingerprint, processEvidence, lifecycleWriter }) {
      assertWritable();
      requireProtectedRunLifecycleWriter(lifecycleWriter);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (typeof runId !== "string" || runId.length === 0 || !Number.isSafeInteger(pid) || pid < 1 || !Number.isSafeInteger(processGroupId) || processGroupId < 1 || !/^[a-f0-9]{64}$/.test(processIdentityFingerprint ?? "") || processEvidence?.verified !== true || processEvidence?.barrier_ready !== true || processEvidence.process_identity_fingerprint !== processIdentityFingerprint || processEvidence.process_identity?.pid !== pid || processEvidence.process_identity?.process_group_id !== processGroupId) throw new Error("RUNTIME_RUN_PROCESS_BINDING_INVALID");
      const now = clock();
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        const current = db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(runId);
        if (!current || current.state !== "STARTING" || current.pid !== null || current.process_group_id !== null) throw new Error("RUNTIME_RUN_PROCESS_BINDING_CONFLICT");
        const observation = { ...JSON.parse(current.observation_json), process_identity_fingerprint: processIdentityFingerprint, process_identity: structuredClone(processEvidence.process_identity), barrier_evidence_fingerprint: processEvidence.fingerprint, containment_profile_id: processEvidence.profile_id, containment_authority_id: processEvidence.authority_id };
        const updated = db.prepare("UPDATE runtime_runs SET pid=?,process_group_id=?,updated_at=?,observation_json=? WHERE run_id=? AND state='STARTING' AND pid IS NULL AND process_group_id IS NULL").run(pid, processGroupId, now, normalizeRuntimeObservation(observation), runId);
        if (Number(updated.changes) !== 1) throw new Error("RUNTIME_RUN_PROCESS_BINDING_CONFLICT");
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { revision: lockedRevision + 1, run: decodeRuntimeRun(db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(runId)) };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    transitionRuntimeRun({ expectedRevision, runId, expectedStates, nextState, patch = {}, recovery = false, lifecycleWriter }) {
      assertWritable({ recovery });
      requireProtectedRunLifecycleWriter(lifecycleWriter);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || api.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
      if (typeof runId !== "string" || runId.length === 0 || !Array.isArray(expectedStates) || expectedStates.length === 0 || expectedStates.some((state) => !RUNTIME_RUN_TRANSITIONS.has(state)) || !RUNTIME_RUN_TRANSITIONS.has(nextState)) throw new Error("RUNTIME_RUN_TRANSITION_INPUT_INVALID");
      if (!expectedStates.every((state) => RUNTIME_RUN_TRANSITIONS.get(state)?.has(nextState))) throw new Error("RUNTIME_RUN_TRANSITION_INVALID");
      const allowedPatch = new Set(["pid", "process_group_id", "exit_code", "signal", "result_fingerprint", "result_size", "observation", "updated_at"]);
      assertClosedKeys(patch, allowedPatch, "RUNTIME_RUN_PATCH");
      if (patch.pid !== undefined && patch.pid !== null && (!Number.isSafeInteger(patch.pid) || patch.pid < 1)) throw new Error("RUNTIME_RUN_PID_INVALID");
      if (patch.process_group_id !== undefined && patch.process_group_id !== null && (!Number.isSafeInteger(patch.process_group_id) || patch.process_group_id < 1)) throw new Error("RUNTIME_RUN_PROCESS_GROUP_INVALID");
      if (patch.exit_code !== undefined && patch.exit_code !== null && !Number.isSafeInteger(patch.exit_code)) throw new Error("RUNTIME_RUN_EXIT_CODE_INVALID");
      if (patch.signal !== undefined && patch.signal !== null && (typeof patch.signal !== "string" || !/^SIG[A-Z0-9]+$/.test(patch.signal))) throw new Error("RUNTIME_RUN_SIGNAL_INVALID");
      if (patch.result_fingerprint !== undefined && patch.result_fingerprint !== null && !/^[a-f0-9]{64}$/.test(patch.result_fingerprint)) throw new Error("RUNTIME_RUN_RESULT_FINGERPRINT_INVALID");
      if (patch.result_size !== undefined && patch.result_size !== null && (!Number.isSafeInteger(patch.result_size) || patch.result_size < 0)) throw new Error("RUNTIME_RUN_RESULT_SIZE_INVALID");
      const now = patch.updated_at ?? clock();
      if (!Number.isFinite(Date.parse(now))) throw new Error("RUNTIME_RUN_UPDATE_TIME_INVALID");
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        if (lockedRevision !== expectedRevision) throw new Error("REVISION_CONFLICT");
        const current = db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(runId);
        if (!current) throw new Error("RUNTIME_RUN_NOT_FOUND");
        if (!expectedStates.includes(current.state) || !RUNTIME_RUN_TRANSITIONS.get(current.state)?.has(nextState)) throw new Error("RUNTIME_RUN_STATE_CONFLICT");
        const observationJson = patch.observation === undefined ? current.observation_json : normalizeRuntimeObservation(patch.observation);
        const updated = db.prepare("UPDATE runtime_runs SET state=?,pid=?,process_group_id=?,updated_at=?,exit_code=?,signal=?,result_fp=?,result_size=?,observation_json=? WHERE run_id=? AND state=?").run(
          nextState,
          patch.pid === undefined ? current.pid : patch.pid,
          patch.process_group_id === undefined ? current.process_group_id : patch.process_group_id,
          now,
          patch.exit_code === undefined ? current.exit_code : patch.exit_code,
          patch.signal === undefined ? current.signal : patch.signal,
          patch.result_fingerprint === undefined ? current.result_fp : patch.result_fingerprint,
          patch.result_size === undefined ? current.result_size : patch.result_size,
          observationJson,
          runId,
          current.state
        );
        if (Number(updated.changes) !== 1) throw new Error("RUNTIME_RUN_STATE_CONFLICT");
        setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        if (recovery) startupRecovery = recoveryState(db);
        return { revision: lockedRevision + 1, run: decodeRuntimeRun(db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(runId)) };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    getRuntimeRun({ runId, idempotencyKey } = {}) {
      assertOpen();
      if (Boolean(runId) === Boolean(idempotencyKey)) throw new Error("RUNTIME_RUN_SELECTOR_REQUIRED");
      const row = runId ? db.prepare("SELECT * FROM runtime_runs WHERE run_id=?").get(runId) : db.prepare("SELECT * FROM runtime_runs WHERE idempotency_key=?").get(idempotencyKey);
      return decodeRuntimeRun(row);
    },
    listUnresolvedRuntimeRuns() {
      assertOpen();
      return db.prepare("SELECT * FROM runtime_runs WHERE state NOT IN ('COMPLETED','FAILED','CANCELLED','TIMED_OUT') ORDER BY run_id").all().map(decodeRuntimeRun);
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
    findIntentByEffectKey(effectKey) {
      assertOpen();
      if (!/^[a-f0-9]{64}$/.test(effectKey ?? "")) throw new Error("EFFECT_KEY_INVALID");
      const row = db.prepare("SELECT * FROM effect_intents WHERE effect_key=?").get(effectKey);
      return row ? { ...row, expected_selector: JSON.parse(row.expected_selector_json) } : undefined;
    },
    recordRuntimeConflict({ conflictKind, idempotencyKey, existingId, existingFingerprint, incomingFingerprint, details = {} }) {
      assertWritable();
      if (!new Set(["effect", "runtime_run"]).has(conflictKind) || typeof idempotencyKey !== "string" || idempotencyKey.length === 0 || typeof existingId !== "string" || existingId.length === 0 || !/^[a-f0-9]{64}$/.test(existingFingerprint ?? "") || !/^[a-f0-9]{64}$/.test(incomingFingerprint ?? "")) throw new Error("RUNTIME_CONFLICT_INVALID");
      assertNoRawSecrets(details);
      const now = clock();
      const conflictId = `runtime-conflict-${digest({ conflict_kind: conflictKind, idempotency_key: idempotencyKey, incoming_fingerprint: incomingFingerprint })}`;
      db.exec("BEGIN IMMEDIATE");
      try {
        const lockedRevision = Number(getMeta(db, "store_revision") ?? 0);
        const inserted = db.prepare("INSERT OR IGNORE INTO runtime_conflicts(conflict_id,conflict_kind,idempotency_key,existing_id,existing_fingerprint,incoming_fingerprint,details_json,observed_at) VALUES(?,?,?,?,?,?,?,?)").run(conflictId, conflictKind, idempotencyKey, existingId, existingFingerprint, incomingFingerprint, canonicalJson(details), now);
        if (Number(inserted.changes) === 1) setMeta(db, "store_revision", lockedRevision + 1);
        db.exec("COMMIT");
        return { conflict_id: conflictId, recorded: Number(inserted.changes) === 1, revision: lockedRevision + Number(inserted.changes) };
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
      }
    },
    listRuntimeConflicts({ conflictKind } = {}) {
      assertOpen();
      if (conflictKind !== undefined && !new Set(["effect", "runtime_run"]).has(conflictKind)) throw new Error("RUNTIME_CONFLICT_KIND_INVALID");
      const rows = conflictKind === undefined ? db.prepare("SELECT * FROM runtime_conflicts ORDER BY observed_at,conflict_id").all() : db.prepare("SELECT * FROM runtime_conflicts WHERE conflict_kind=? ORDER BY observed_at,conflict_id").all(conflictKind);
      return rows.map((row) => ({ ...row, details: JSON.parse(row.details_json) }));
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
    finalizeReconciliation({ expectedRevision, effectId, records = [], receipt, events = [], recovery = false, finalizationFence }) {
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
        if (lockedIntent.activation_fp === "legacy" || lockedIntent.binding_fp === "legacy" || lockedIntent.policy_revision === "legacy" || lockedIntent.settings_revision === "legacy") throw new Error("LEGACY_INTENT_REAUTHORIZATION_REQUIRED");
        {
          if (!finalizationFence || finalizationFence.activation_fingerprint !== lockedIntent.activation_fp || finalizationFence.policy_revision !== lockedIntent.policy_revision || finalizationFence.settings_revision !== lockedIntent.settings_revision || finalizationFence.authority_epoch !== Number(lockedIntent.authority_epoch) || finalizationFence.decision_expires_at !== lockedIntent.decision_expires_at) throw new Error("EFFECT_FINALIZATION_FENCE_BINDING_INVALID");
          if (Number(getMeta(db, "revocation_epoch") ?? 0) !== Number(lockedIntent.authority_epoch)) throw new Error("EFFECT_FINALIZATION_AUTHORITY_EPOCH_STALE");
          if (!Number.isFinite(Date.parse(lockedIntent.decision_expires_at)) || Date.parse(lockedIntent.decision_expires_at) < Date.parse(now)) throw new Error("EFFECT_FINALIZATION_DECISION_EXPIRED");
          const approvalIds = JSON.parse(lockedIntent.approval_ids_json);
          for (const approvalId of approvalIds) {
            const approval = db.prepare("SELECT state,consumed_by,expires_at,authority_epoch,policy_revision,settings_revision FROM runtime_approvals WHERE approval_id=?").get(approvalId);
            if (!approval || approval.state !== "consumed" || approval.consumed_by !== effectId || Date.parse(approval.expires_at) < Date.parse(now) || Number(approval.authority_epoch) !== Number(lockedIntent.authority_epoch) || approval.policy_revision !== lockedIntent.policy_revision || approval.settings_revision !== lockedIntent.settings_revision) throw new Error("EFFECT_FINALIZATION_APPROVAL_INVALID");
          }
          if (!finalizationFenceVerifier || finalizationFenceVerifier.trusted !== true || finalizationFenceVerifier.independent !== true || typeof finalizationFenceVerifier.verifier_id !== "string" || typeof finalizationFenceVerifier.verify !== "function") throw new Error("EFFECT_FINALIZATION_FENCE_VERIFIER_REQUIRED");
          const fenceFingerprint = digest({ effect_id: effectId, intent: lockedIntent, finalization_fence: finalizationFence, locked_revision: lockedRevision, now });
          const fenceVerdict = finalizationFenceVerifier.verify({ effect_id: effectId, intent: structuredClone(lockedIntent), finalization_fence: structuredClone(finalizationFence), fingerprint: fenceFingerprint, now });
          if (fenceVerdict && typeof fenceVerdict.then === "function") throw new Error("EFFECT_FINALIZATION_ASYNC_VERIFIER_UNSUPPORTED");
          if (fenceVerdict?.verified !== true || fenceVerdict.verifier_id !== finalizationFenceVerifier.verifier_id || fenceVerdict.fingerprint !== fenceFingerprint || fenceVerdict.activation_fingerprint !== lockedIntent.activation_fp || fenceVerdict.policy_revision !== lockedIntent.policy_revision || fenceVerdict.settings_revision !== lockedIntent.settings_revision || fenceVerdict.authority_epoch !== Number(lockedIntent.authority_epoch)) throw new Error("EFFECT_FINALIZATION_FENCE_VERIFICATION_FAILED");
        }
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
      const sections = ["store_meta", "records", "relations", "events", "effect_intents", "outbox", "receipts", "settings_change_plans", "saga_replay_state", "saga_nonces", "runtime_approvals", "runtime_runs", "runtime_conflicts"];
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
  if (protectedRuntimeVerifiers) PROTECTED_WORKFLOW_STATE_STORES.add(api);
  return api;
}

export function assertProtectedWorkflowStateStore(store) {
  if (!PROTECTED_WORKFLOW_STATE_STORES.has(store)) throw new Error("PROTECTED_WORKFLOW_STATE_STORE_REQUIRED");
  return store;
}

export function verifyBackupManifest({ backup, manifestPath, expectedIdentity }) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const regular = manifest.format === "workflow-state-backup-v1" && manifest.schema_version === STORE_SCHEMA_VERSION;
  const preMigration = manifest.format === "workflow-state-pre-migration-backup-v1" && Number.isSafeInteger(manifest.from_schema_version) && manifest.schema_version === manifest.from_schema_version && manifest.to_schema_version === STORE_SCHEMA_VERSION;
  if ((!regular && !preMigration) || !Number.isSafeInteger(manifest.source_revision) || manifest.source_revision < 0 || !Number.isSafeInteger(manifest.revocation_epoch) || manifest.revocation_epoch < 0 || !Number.isFinite(Date.parse(manifest.created_at))) throw new Error("BACKUP_MANIFEST_INVALID");
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
    if (manifest.format === "workflow-state-backup-v1") assertMigrationIdentity(restored, identity, "RESTORE");
    else if (canonicalJson(getMeta(restored, "identity")) !== canonicalJson(identity)) throw new Error("RESTORE_IDENTITY_MISMATCH");
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
  const allowedTables = new Set(["store_meta", "records", "relations", "events", "effect_intents", "outbox", "receipts", "settings_change_plans", "saga_replay_state", "saga_nonces", "runtime_approvals", "runtime_runs", "runtime_conflicts"]);
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
    for (const table of ["full_text_documents", "runtime_conflicts", "runtime_runs", "runtime_approvals", "saga_nonces", "saga_replay_state", "receipts", "outbox", "effect_intents", "relations", "events", "settings_change_plans", "records", "store_meta"]) imported.exec(`DELETE FROM ${table}`);
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
