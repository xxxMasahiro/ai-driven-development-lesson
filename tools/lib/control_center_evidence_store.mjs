import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CONTROL_CENTER_EVIDENCE_STORE_SCHEMA_VERSION = "0.1.0";
export const CONTROL_CENTER_EVIDENCE_STORE_DIR = ".control-center/evidence";

function isoNow() {
  return new Date().toISOString();
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeNamespace(value) {
  const normalized = String(value || "default").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "default";
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function relativeToRoot(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function readLedgerCount(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    return 0;
  }
  const text = fs.readFileSync(ledgerPath, "utf8");
  return text.split(/\r?\n/).filter(Boolean).length;
}

function acquireLock(lockPath, timeoutMs = 3000) {
  const startedAt = Date.now();
  while (true) {
    try {
      return fs.openSync(lockPath, "wx");
    } catch (error) {
      if (error?.code !== "EEXIST" || Date.now() - startedAt > timeoutMs) {
        throw new Error(`could not acquire evidence store lock: ${path.basename(lockPath)}`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}

function releaseLock(lockFd, lockPath) {
  try {
    fs.closeSync(lockFd);
  } finally {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // A stale lock cleanup failure must not hide the completed write result.
    }
  }
}

export function appendControlCenterEvidenceRecord({
  root = process.cwd(),
  namespace = "control-center",
  kind = "evidence",
  commandId = "",
  profileId = "",
  dryRun = false,
  payload = {},
  source = {},
} = {}) {
  const safe = safeNamespace(namespace);
  const storeDir = path.resolve(root, CONTROL_CENTER_EVIDENCE_STORE_DIR, safe);
  const detailsDir = path.join(storeDir, "details");
  const ledgerPath = path.join(storeDir, "ledger.jsonl");
  const lockPath = path.join(storeDir, "ledger.lock");
  ensureDir(detailsDir);
  const lockFd = acquireLock(lockPath);
  try {
    const sequence = readLedgerCount(ledgerPath) + 1;
    const createdAt = isoNow();
    const recordSeed = JSON.stringify({ safe, kind, commandId, profileId, dryRun, payload, source, sequence, createdAt });
    const recordId = `cce:${sha256Text(recordSeed).slice(0, 24)}`;
    const detailPath = path.join(detailsDir, `${recordId}.json`);
    const publicRecord = {
      schema_version: CONTROL_CENTER_EVIDENCE_STORE_SCHEMA_VERSION,
      record_id: recordId,
      namespace: safe,
      kind,
      command_id: commandId,
      profile_id: profileId,
      dry_run: dryRun === true,
      sequence,
      created_at: createdAt,
      payload_digest: `sha256:${sha256Text(JSON.stringify(payload))}`,
      source,
      detail_path: relativeToRoot(root, detailPath),
    };
    const detail = {
      ...publicRecord,
      payload,
    };
    const tempPath = `${detailPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(detail, null, 2)}\n`, "utf8");
    fs.renameSync(tempPath, detailPath);
    fs.appendFileSync(ledgerPath, `${JSON.stringify(publicRecord)}\n`, "utf8");
    return {
      ...publicRecord,
      ledger_path: relativeToRoot(root, ledgerPath),
    };
  } finally {
    releaseLock(lockFd, lockPath);
  }
}

export function readControlCenterEvidenceLedger({ root = process.cwd(), namespace = "control-center" } = {}) {
  const safe = safeNamespace(namespace);
  const ledgerPath = path.resolve(root, CONTROL_CENTER_EVIDENCE_STORE_DIR, safe, "ledger.jsonl");
  if (!fs.existsSync(ledgerPath)) {
    return [];
  }
  return fs.readFileSync(ledgerPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
