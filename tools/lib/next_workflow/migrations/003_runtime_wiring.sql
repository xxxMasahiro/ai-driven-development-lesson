ALTER TABLE effect_intents ADD COLUMN authority_epoch INTEGER NOT NULL DEFAULT 0 CHECK(authority_epoch >= 0);
ALTER TABLE effect_intents ADD COLUMN decision_expires_at TEXT;
ALTER TABLE effect_intents ADD COLUMN settings_revision TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE effect_intents ADD COLUMN policy_revision TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE effect_intents ADD COLUMN activation_fp TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE effect_intents ADD COLUMN approval_ids_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(approval_ids_json));
ALTER TABLE effect_intents ADD COLUMN binding_fp TEXT NOT NULL DEFAULT 'legacy';

UPDATE effect_intents
SET state='MANUAL_RECOVERY_REQUIRED'
WHERE state!='RECONCILED';

CREATE TABLE IF NOT EXISTS runtime_approvals (
  approval_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  checkout_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  target_id TEXT NOT NULL,
  request_fp TEXT NOT NULL,
  policy_revision TEXT NOT NULL,
  settings_revision TEXT NOT NULL,
  authority_epoch INTEGER NOT NULL CHECK(authority_epoch >= 0),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verifier_id TEXT NOT NULL,
  proof_fp TEXT NOT NULL,
  binding_fp TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('pending','consumed')),
  consumed_by TEXT UNIQUE REFERENCES effect_intents(effect_id),
  consumed_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS runtime_runs (
  run_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  plan_fp TEXT NOT NULL,
  authority_epoch INTEGER NOT NULL CHECK(authority_epoch >= 0),
  fence_fp TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('STARTING','RUNNING','CANCELLING','TERMINATING','COMPLETED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN','CONFLICT')),
  pid INTEGER,
  process_group_id INTEGER,
  start_nonce TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  exit_code INTEGER,
  signal TEXT,
  result_fp TEXT,
  result_size INTEGER CHECK(result_size IS NULL OR result_size >= 0),
  observation_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(observation_json))
) STRICT;

CREATE TABLE IF NOT EXISTS runtime_conflicts (
  conflict_id TEXT PRIMARY KEY,
  conflict_kind TEXT NOT NULL CHECK(conflict_kind IN ('effect','runtime_run')),
  idempotency_key TEXT NOT NULL,
  existing_id TEXT NOT NULL,
  existing_fingerprint TEXT NOT NULL,
  incoming_fingerprint TEXT NOT NULL,
  details_json TEXT NOT NULL CHECK(json_valid(details_json)),
  observed_at TEXT NOT NULL,
  UNIQUE(conflict_kind,idempotency_key,incoming_fingerprint)
) STRICT;
