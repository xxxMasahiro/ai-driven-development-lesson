import { createHash } from "node:crypto";

const SECTIONS = ["repository", "task", "authorities", "documents", "runtime", "history", "git", "impact_plan", "adapter_summaries"];
const TRUST = new Set(["invariant", "authority", "owner_record", "verified_evidence", "untrusted_repository", "untrusted_provider", "untrusted_agent", "untrusted_log"]);
const INTERPRETATION = new Set(["instruction", "data", "candidate_evidence"]);
const SENSITIVITY_ORDER = ["public", "internal", "restricted"];
const INSTRUCTION_ORIGINS = new Set(["invariant_policy", "resolved_procedural_instruction", "current_owner_scope"]);
const REQUIRED_SECTIONS = new Set(SECTIONS);
const INSTRUCTION_ENVELOPES = Object.freeze({
  invariant_policy: { section: "authorities", trust_class: "invariant" },
  resolved_procedural_instruction: { section: "documents", trust_class: "authority" },
  current_owner_scope: { section: "task", trust_class: "owner_record" }
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeEntries(section, value) {
  if (value === undefined || value === null) return [];
  const inputs = Array.isArray(value) ? value : [value];
  return inputs.map((entry, index) => {
    if (!entry || typeof entry !== "object" || !entry.envelope || !("value" in entry)) throw new Error(`CONTEXT_ENTRY_ENVELOPE_REQUIRED:${section}:${index}`);
    const envelope = entry.envelope;
    for (const field of ["source_id", "origin", "trust_class", "sensitivity", "interpretation", "fresh_until"]) {
      if (typeof envelope[field] !== "string" || envelope[field].length === 0) throw new Error(`CONTEXT_ENVELOPE_FIELD_REQUIRED:${section}:${field}`);
    }
    if (!TRUST.has(envelope.trust_class)) throw new Error(`CONTEXT_TRUST_INVALID:${envelope.trust_class}`);
    if (!INTERPRETATION.has(envelope.interpretation)) throw new Error(`CONTEXT_INTERPRETATION_INVALID:${envelope.interpretation}`);
    if (!SENSITIVITY_ORDER.includes(envelope.sensitivity)) throw new Error(`CONTEXT_SENSITIVITY_INVALID:${envelope.sensitivity}`);
    if (envelope.interpretation === "instruction" && !INSTRUCTION_ORIGINS.has(envelope.origin)) throw new Error(`CONTEXT_INSTRUCTION_ORIGIN_FORBIDDEN:${envelope.origin}`);
    if (envelope.interpretation === "instruction") {
      const allowed = INSTRUCTION_ENVELOPES[envelope.origin];
      if (!allowed || allowed.section !== section || allowed.trust_class !== envelope.trust_class) throw new Error(`CONTEXT_INSTRUCTION_ENVELOPE_FORBIDDEN:${section}:${envelope.origin}:${envelope.trust_class}`);
    }
    if (["adapter_summaries", "history"].includes(section) && envelope.interpretation === "instruction") throw new Error(`CONTEXT_SECTION_CANNOT_INSTRUCT:${section}`);
    const contentFingerprint = digest(entry.value);
    if (envelope.fingerprint && envelope.fingerprint !== contentFingerprint) throw new Error(`CONTEXT_FINGERPRINT_MISMATCH:${envelope.source_id}`);
    return { section, key: entry.key ?? envelope.source_id, envelope: { ...envelope, fingerprint: contentFingerprint }, value: entry.value };
  });
}

export function compileWorkContextFrame({ repository, task, authorities, documents, runtime, history, git, impactPlan, adapterSummaries, limits = {}, now = new Date().toISOString() }) {
  const rawSections = { repository, task, authorities, documents, runtime, history, git, impact_plan: impactPlan, adapter_summaries: adapterSummaries };
  const maxItems = limits.max_items ?? 500;
  const maxBytes = limits.max_bytes ?? 1_000_000;
  const perSection = limits.per_section ?? {};
  const maxSensitivity = limits.max_sensitivity ?? "restricted";
  if (!Number.isFinite(Date.parse(now))) throw new Error("CONTEXT_CLOCK_INVALID");
  if (!Number.isInteger(maxItems) || maxItems < 1 || !Number.isInteger(maxBytes) || maxBytes < 128 || !SENSITIVITY_ORDER.includes(maxSensitivity)) throw new Error("CONTEXT_LIMIT_INVALID");
  const all = SECTIONS.flatMap((section) => normalizeEntries(section, rawSections[section])).sort((a, b) => `${a.section}:${a.key}:${a.envelope.source_id}`.localeCompare(`${b.section}:${b.key}:${b.envelope.source_id}`));
  const omissions = [];
  const accepted = [];
  let usedBytes = 0;
  const sectionCounts = new Map();
  for (const entry of all) {
    const stale = Number.isNaN(Date.parse(entry.envelope.fresh_until)) || Date.parse(entry.envelope.fresh_until) < Date.parse(now);
    if (stale) {
      omissions.push({ source_id: entry.envelope.source_id, section: entry.section, reason: "stale" });
      continue;
    }
    if (SENSITIVITY_ORDER.indexOf(entry.envelope.sensitivity) > SENSITIVITY_ORDER.indexOf(maxSensitivity)) {
      omissions.push({ source_id: entry.envelope.source_id, section: entry.section, reason: "sensitivity" });
      continue;
    }
    const sectionLimit = perSection[entry.section] ?? maxItems;
    if ((sectionCounts.get(entry.section) ?? 0) >= sectionLimit) {
      omissions.push({ source_id: entry.envelope.source_id, section: entry.section, reason: "section_limit" });
      continue;
    }
    const bytes = Buffer.byteLength(canonicalJson(entry), "utf8");
    if (accepted.length >= maxItems || usedBytes + bytes > maxBytes) {
      omissions.push({ source_id: entry.envelope.source_id, section: entry.section, reason: "frame_limit" });
      continue;
    }
    accepted.push(entry);
    usedBytes += bytes;
    sectionCounts.set(entry.section, (sectionCounts.get(entry.section) ?? 0) + 1);
  }
  const conflicts = [];
  const byKey = new Map();
  for (const entry of accepted) {
    const identity = `${entry.section}:${entry.key}`;
    const prior = byKey.get(identity);
    if (prior && prior.envelope.fingerprint !== entry.envelope.fingerprint) conflicts.push({ section: entry.section, key: entry.key, sources: [prior.envelope.source_id, entry.envelope.source_id].sort(), fingerprints: [prior.envelope.fingerprint, entry.envelope.fingerprint].sort() });
    else if (!prior) byKey.set(identity, entry);
  }
  const resolvedInstructions = accepted.filter((entry) => entry.envelope.origin === "resolved_procedural_instruction" && entry.envelope.interpretation === "instruction");
  const authorityOmissions = omissions.filter((omission) => omission.section === "authorities");
  const blockerCodes = [];
  if (resolvedInstructions.length !== 1) blockerCodes.push("RESOLVED_INSTRUCTION_CARDINALITY");
  if (authorityOmissions.length) blockerCodes.push("AUTHORITY_OMITTED_OR_STALE");
  for (const section of REQUIRED_SECTIONS) if (!accepted.some((entry) => entry.section === section)) blockerCodes.push(`REQUIRED_CONTEXT_SECTION_MISSING:${section}`);
  if (conflicts.length) blockerCodes.push("CONTEXT_CONFLICT");
  const sections = Object.fromEntries(SECTIONS.map((section) => [section, accepted.filter((entry) => entry.section === section).map(({ section: _, ...entry }) => entry)]));
  const frame = {
    schema_version: "1.0.0",
    compiled_at: now,
    decision: blockerCodes.length ? "STOP" : "PASS",
    blocker_codes: blockerCodes,
    sections,
    omissions,
    conflicts,
    limits: { max_items: maxItems, max_bytes: maxBytes, max_sensitivity: maxSensitivity, per_section: perSection },
    item_count: accepted.length,
    byte_count: usedBytes
  };
  return { ...frame, fingerprint: digest(frame) };
}

export function contextEntry({ sourceId, origin, trustClass, sensitivity = "internal", interpretation = "data", freshUntil, key, value }) {
  return { key, value, envelope: { source_id: sourceId, origin, trust_class: trustClass, sensitivity, interpretation, fresh_until: freshUntil, fingerprint: digest(value) } };
}
