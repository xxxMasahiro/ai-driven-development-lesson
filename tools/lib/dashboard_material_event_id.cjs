const crypto = require("node:crypto");

const MAX_MATERIAL_EVENT_ID_LENGTH = 160;
const HASH_LENGTH = 16;

function normalizedIdentifier(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function materialEventId(value) {
  const original = String(value || "");
  const normalized = normalizedIdentifier(original);
  const digest = crypto.createHash("sha256").update(original).digest("hex").slice(0, HASH_LENGTH);
  const candidate = normalized || `event-${digest}`;
  if (candidate.length <= MAX_MATERIAL_EVENT_ID_LENGTH) {
    return candidate;
  }

  const prefixLimit = MAX_MATERIAL_EVENT_ID_LENGTH - HASH_LENGTH - 1;
  const prefix = candidate.slice(0, prefixLimit).replace(/[._-]+$/g, "") || "event";
  return `${prefix}-${digest}`;
}

module.exports = {
  MAX_MATERIAL_EVENT_ID_LENGTH,
  materialEventId,
};
