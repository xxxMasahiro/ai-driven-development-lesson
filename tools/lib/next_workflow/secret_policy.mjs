const SECRET_KEY = /(^|_)(secret|password|credential|private_key|access_token|refresh_token|api_key|auth_token|token)($|_)/i;
const SECRET_ASSIGNMENT = /\b(?:token|password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\s*[:=]\s*["']?[^\s,"'}]{6,}/gi;
const SECRET_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{16,}/g,
  /\bsk-[A-Za-z0-9_-]{12,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g,
  /(?:[?&](?:X-Amz-Signature|Signature|sig|token|api[_-]?key)=)[^&#\s]+/gi,
];

const SECRET_REFERENCE_KEYS = new Set([
  "reference_id",
  "namespace",
  "resolver",
  "audience",
  "adapter_id",
  "scope",
  "issued_at",
  "expires_at",
  "revocation_state",
  "rotation_epoch",
  "revocation_epoch",
  "delivery_mode",
]);

export function secretLikeString(value) {
  if (typeof value !== "string") return false;
  SECRET_ASSIGNMENT.lastIndex = 0;
  if (SECRET_ASSIGNMENT.test(value)) return true;
  return SECRET_VALUE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function findSecretMaterial(value, path = "root", { allowedKeyNames = new Set() } = {}) {
  if (typeof value === "string") return secretLikeString(value) ? `${path}:secret_like_value` : null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSecretMaterial(value[index], `${path}[${index}]`, { allowedKeyNames });
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key) && !allowedKeyNames.has(key)) return `${path}.${key}:secret_key`;
    const found = findSecretMaterial(child, `${path}.${key}`, { allowedKeyNames });
    if (found) return found;
  }
  return null;
}

export function assertNoSecretMaterial(value, code = "RAW_SECRET_FIELD_FORBIDDEN", options = {}) {
  const found = findSecretMaterial(value, "root", options);
  if (found) {
    const error = new Error(code);
    error.secret_path = found;
    throw error;
  }
  return value;
}

export function validateSecretReferenceShape(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) throw new Error("SECRET_REFERENCE_REQUIRED");
  assertNoSecretMaterial(reference, "RAW_SECRET_REFERENCE_FORBIDDEN", { allowedKeyNames: SECRET_REFERENCE_KEYS });
  if (Object.keys(reference).some((key) => !SECRET_REFERENCE_KEYS.has(key))) throw new Error("SECRET_REFERENCE_FIELD_FORBIDDEN");
  return reference;
}

export function redactSecretText(value) {
  let result = String(value ?? "");
  result = result.replace(SECRET_ASSIGNMENT, (match) => `${match.split(/\s*[:=]\s*/u, 1)[0]}=[REDACTED]`);
  for (const pattern of SECRET_VALUE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => {
      if (/^Bearer\s/i.test(match)) return "Bearer [REDACTED]";
      if (/^[?&]/.test(match)) return `${match.slice(0, match.indexOf("=") + 1)}[REDACTED]`;
      return "[REDACTED]";
    });
  }
  return result;
}

export function secretPolicyDigestInput() {
  return {
    key_pattern: SECRET_KEY.source,
    assignment_pattern: SECRET_ASSIGNMENT.source,
    value_patterns: SECRET_VALUE_PATTERNS.map((pattern) => pattern.source),
    secret_reference_keys: [...SECRET_REFERENCE_KEYS].sort(),
  };
}
