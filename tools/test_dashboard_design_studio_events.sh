#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

STORE_DIR="$TMP_DIR/design-studio-events"
export DASHBOARD_DESIGN_STUDIO_EVENT_STORE_DIR="$STORE_DIR"
export DASHBOARD_DESIGN_STUDIO_EVENT_NOW="2026-06-18T00:00:00.000Z"

event_id_from() {
  node -e 'const fs = require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).event.event_id);' "$1"
}

assert_event_json() {
  local file="$1"
  local expected_status="$2"
  local expected_state="$3"
  node - "$file" "$expected_status" "$expected_state" <<'NODE'
const fs = require("fs");
const [file, expectedStatus, expectedState] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (payload.status !== expectedStatus) {
  fail(`expected status ${expectedStatus}, got ${payload.status}`);
}
if (payload.sync_id !== "dashboard_design_studio_event_runner_store") {
  fail("event output must carry the event-runner/store sync id");
}
if (!payload.store || payload.store.append_only !== true || payload.store.retention_policy !== "metadata_and_redacted_preview_only") {
  fail("event output must describe the append-only metadata store");
}
if (!payload.runner?.required_capabilities?.includes("audit_receipt")) {
  fail("event output must expose runner capability evidence");
}
if (!payload.runner?.forbidden_capabilities?.includes("arbitrary_shell")) {
  fail("event output must expose forbidden runner capabilities");
}
if (payload.event.lifecycle_state !== expectedState) {
  fail(`expected lifecycle ${expectedState}, got ${payload.event.lifecycle_state}`);
}
if (payload.event.writes_allowed !== false || payload.event.direct_apply_authority !== false || payload.event.external_product_apply !== false) {
  fail("event must not grant write, direct apply, or external product apply authority");
}
if (!/^sha256:[a-f0-9]{64}$/.test(payload.event.audit_receipt || "")) {
  fail("event must include a sha256 audit receipt");
}
if ("intent_text" in payload.event) {
  fail("event output must not expose raw intent_text");
}
NODE
}

queue_out="$TMP_DIR/queue.json"
"$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode manual \
  --request-kind design-intent \
  --intent-text "Make the dashboard status cards easier to scan without changing behavior." \
  --purpose "local proposal queue smoke test" \
  --idempotency-key dashboard-event-smoke-0001 \
  >"$queue_out"
assert_event_json "$queue_out" queued queued
event_id="$(event_id_from "$queue_out")"

node - "$STORE_DIR/events.jsonl" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
function fail(message) {
  console.error(message);
  process.exit(1);
}
if ((raw.match(/\n/g) || []).length !== 1) {
  fail("event store should contain one queued record");
}
if (raw.includes('"intent_text"')) {
  fail("event store must not persist raw intent_text");
}
const record = JSON.parse(raw.trim());
if (record.payload_policy !== "metadata_and_redacted_preview_only") {
  fail("event store must use metadata and redacted preview retention");
}
if (record.intent_preview !== "Make the dashboard status cards easier to scan without changing behavior.") {
  fail("event store should retain only the bounded preview for operator review");
}
NODE

line_count_before="$(wc -l <"$STORE_DIR/events.jsonl")"
dedupe_out="$TMP_DIR/dedupe.json"
"$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode manual \
  --request-kind design-intent \
  --intent-text "Make the dashboard status cards easier to scan without changing behavior." \
  --purpose "local proposal queue smoke test" \
  --idempotency-key dashboard-event-smoke-0001 \
  >"$dedupe_out"
assert_event_json "$dedupe_out" deduplicated queued
line_count_after="$(wc -l <"$STORE_DIR/events.jsonl")"
if [[ "$line_count_after" != "$line_count_before" ]]; then
  printf 'duplicate idempotency key appended a new event record\n' >&2
  exit 1
fi

status_out="$TMP_DIR/status.json"
"$ROOT/tools/dashboard-design-system" event-status --event-id "$event_id" >"$status_out"
assert_event_json "$status_out" passed queued

list_out="$TMP_DIR/list.json"
"$ROOT/tools/dashboard-design-system" list-events --state queued >"$list_out"
node - "$list_out" "$event_id" <<'NODE'
const fs = require("fs");
const [file, expectedEventId] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
if (payload.status !== "passed" || payload.count !== 1 || payload.events[0].event_id !== expectedEventId) {
  console.error("list-events did not return the queued event");
  process.exit(1);
}
NODE

cancel_missing_confirm="$TMP_DIR/cancel-missing-confirm.err"
if "$ROOT/tools/dashboard-design-system" cancel-event --event-id "$event_id" >"$TMP_DIR/cancel-missing-confirm.json" 2>"$cancel_missing_confirm"; then
  printf 'cancel-event without --confirm passed unexpectedly\n' >&2
  exit 1
fi
grep 'cancel-event requires --confirm' "$cancel_missing_confirm" >/dev/null

cancel_out="$TMP_DIR/cancel.json"
"$ROOT/tools/dashboard-design-system" cancel-event --event-id "$event_id" --confirm >"$cancel_out"
assert_event_json "$cancel_out" passed cancelled

external_out="$TMP_DIR/external.json"
"$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref external-product \
  --provider-mode manual \
  --request-kind template \
  --intent-text "Prepare a product-local design-system proposal without writing to the product repository." \
  --idempotency-key external-product-plan-0001 \
  >"$external_out"
assert_event_json "$external_out" queued manual_required
node - "$external_out" <<'NODE'
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (payload.event.target_apply_mode !== "plan-only") {
  console.error("external product event must remain plan-only");
  process.exit(1);
}
NODE

subscription_out="$TMP_DIR/subscription.json"
"$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode subscription-agent \
  --request-kind manual-proposal \
  --intent-text "Prepare a proposal packet for manual import by a subscribed CLI agent." \
  --idempotency-key subscription-agent-plan-0001 \
  >"$subscription_out"
assert_event_json "$subscription_out" queued manual_required

dead_letter_seed="$TMP_DIR/dead-letter-seed.json"
"$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode manual \
  --request-kind mock \
  --intent-text "Create a local mock-analysis candidate envelope for review." \
  --idempotency-key dead-letter-retry-0001 \
  >"$dead_letter_seed"
dead_letter_event_id="$(event_id_from "$dead_letter_seed")"

dead_letter_out="$TMP_DIR/dead-letter.json"
"$ROOT/tools/dashboard-design-system" dead-letter-event \
  --event-id "$dead_letter_event_id" \
  --reason "manual fixture moved to dead-letter for retry coverage" \
  --confirm \
  >"$dead_letter_out"
assert_event_json "$dead_letter_out" passed dead_letter

retry_out="$TMP_DIR/retry.json"
"$ROOT/tools/dashboard-design-system" retry-event --event-id "$dead_letter_event_id" --confirm >"$retry_out"
assert_event_json "$retry_out" passed queued
node - "$retry_out" <<'NODE'
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (payload.event.retry_count !== 1) {
  console.error("retry-event must increment retry_count");
  process.exit(1);
}
NODE

api_key_err="$TMP_DIR/api-key.err"
if "$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode api-key \
  --request-kind design-intent \
  --intent-text "Try to use provider mode that is intentionally blocked." \
  --idempotency-key api-key-blocked-0001 \
  >"$TMP_DIR/api-key.json" 2>"$api_key_err"; then
  printf 'api-key provider mode passed unexpectedly\n' >&2
  exit 1
fi
grep 'api-key provider mode is blocked' "$api_key_err" >/dev/null

secret_err="$TMP_DIR/secret.err"
if "$ROOT/tools/dashboard-design-system" queue-request \
  --target-ref dashboard-control-center \
  --provider-mode manual \
  --request-kind design-intent \
  --intent-text "PASSWORD=abcdefghijkl should be rejected before persistence." \
  --idempotency-key secret-rejected-0001 \
  >"$TMP_DIR/secret.json" 2>"$secret_err"; then
  printf 'secret-like payload passed unexpectedly\n' >&2
  exit 1
fi
grep 'must not contain secret-like payloads' "$secret_err" >/dev/null
if grep -F 'PASSWORD=abcdefghijkl' "$STORE_DIR/events.jsonl" >/dev/null; then
  printf 'secret-like payload reached the event store\n' >&2
  exit 1
fi

printf 'Dashboard Design Studio event runner/store tests passed.\n'
