CREATE TABLE IF NOT EXISTS store_meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json))
) STRICT;

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  record_revision INTEGER NOT NULL CHECK (record_revision > 0),
  repository_id TEXT NOT NULL,
  checkout_id TEXT NOT NULL,
  authority_scope TEXT NOT NULL,
  lineage_id TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  source_revision TEXT NOT NULL,
  policy_fp TEXT NOT NULL,
  input_fp TEXT NOT NULL,
  content_fp TEXT NOT NULL,
  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('public','internal','restricted')),
  fresh_until TEXT,
  created_at TEXT NOT NULL,
  superseded_by TEXT REFERENCES records(id)
) STRICT;

CREATE TABLE IF NOT EXISTS relations (
  from_id TEXT NOT NULL REFERENCES records(id),
  relation_kind TEXT NOT NULL,
  to_id TEXT NOT NULL REFERENCES records(id),
  PRIMARY KEY (from_id, relation_kind, to_id)
) STRICT;

CREATE TABLE IF NOT EXISTS events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  aggregate_id TEXT REFERENCES records(id),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  authority_decision_id TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS effect_intents (
  effect_id TEXT PRIMARY KEY,
  effect_key TEXT NOT NULL UNIQUE,
  request_fp TEXT NOT NULL,
  authority_fp TEXT NOT NULL,
  target_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  expected_selector_json TEXT NOT NULL CHECK (json_valid(expected_selector_json)),
  attempt_lineage TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PREPARED','DISPATCHING','OBSERVED','RECONCILED','CONFLICT','UNKNOWN','MANUAL_RECOVERY_REQUIRED'))
) STRICT;

CREATE TABLE IF NOT EXISTS outbox (
  outbox_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL REFERENCES effect_intents(effect_id),
  message_fp TEXT NOT NULL UNIQUE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  state TEXT NOT NULL CHECK (state IN ('pending','sending','delivered','quarantined')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
) STRICT;

CREATE TABLE IF NOT EXISTS receipts (
  receipt_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL UNIQUE REFERENCES effect_intents(effect_id),
  object_identity TEXT NOT NULL,
  observation_fp TEXT NOT NULL,
  proof_record_id TEXT NOT NULL REFERENCES records(id),
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS settings_change_plans (
  token_hash TEXT PRIMARY KEY,
  plan_fingerprint TEXT NOT NULL,
  plan_json TEXT NOT NULL CHECK (json_valid(plan_json)),
  state TEXT NOT NULL CHECK (state IN ('pending','used')),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
) STRICT;

CREATE VIRTUAL TABLE IF NOT EXISTS full_text_documents USING fts5(record_id UNINDEXED, body);
