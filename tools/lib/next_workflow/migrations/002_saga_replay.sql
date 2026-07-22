ALTER TABLE effect_intents ADD COLUMN created_at TEXT;

CREATE TABLE IF NOT EXISTS saga_replay_state (
  relationship_id TEXT PRIMARY KEY,
  authority_epoch INTEGER NOT NULL CHECK (authority_epoch >= 0),
  last_sequence INTEGER NOT NULL CHECK (last_sequence >= 0),
  last_message_fp TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS saga_nonces (
  relationship_id TEXT NOT NULL REFERENCES saga_replay_state(relationship_id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  message_fp TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  PRIMARY KEY (relationship_id, nonce)
) STRICT;
