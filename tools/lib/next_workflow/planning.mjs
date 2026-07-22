import { createHash } from "node:crypto";

const KINDS = ["requirement", "specification", "owner", "file", "check", "aggregate", "ci_job", "evidence_type"];

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeNode(kind, input) {
  if (!input || typeof input !== "object" || typeof input.id !== "string" || input.id.length === 0) throw new Error(`IMPACT_NODE_INVALID:${kind}`);
  return { ...input, id: input.id, kind };
}

export function buildImpactGraph({ requirements = [], specifications = [], owners = [], files = [], checks = [], aggregates = [], ciJobs = [], evidenceTypes = [], edges = [] } = {}) {
  const groups = { requirement: requirements, specification: specifications, owner: owners, file: files, check: checks, aggregate: aggregates, ci_job: ciJobs, evidence_type: evidenceTypes };
  const nodes = new Map();
  for (const kind of KINDS) {
    for (const input of groups[kind]) {
      const node = normalizeNode(kind, input);
      if (nodes.has(node.id)) throw new Error(`IMPACT_NODE_DUPLICATE:${node.id}`);
      nodes.set(node.id, node);
    }
  }
  const normalizedEdges = [];
  const unknownEdges = [];
  for (const edge of edges) {
    if (!edge || typeof edge.from !== "string" || typeof edge.to !== "string" || typeof edge.relation !== "string") throw new Error("IMPACT_EDGE_INVALID");
    const normalized = { from: edge.from, to: edge.to, relation: edge.relation, owner: edge.owner ?? null, inputs_fingerprint: edge.inputs_fingerprint ?? digest({ from: edge.from, to: edge.to, relation: edge.relation }) };
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) unknownEdges.push(normalized);
    else normalizedEdges.push(normalized);
  }
  normalizedEdges.sort((a, b) => `${a.from}:${a.to}:${a.relation}`.localeCompare(`${b.from}:${b.to}:${b.relation}`));
  const adjacency = new Map([...nodes.keys()].map((id) => [id, []]));
  const reverseAdjacency = new Map([...nodes.keys()].map((id) => [id, []]));
  for (const edge of normalizedEdges) {
    adjacency.get(edge.from).push(edge.to);
    reverseAdjacency.get(edge.to).push(edge.from);
  }
  for (const targets of adjacency.values()) targets.sort();
  for (const sources of reverseAdjacency.values()) sources.sort();
  const serializable = { nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), edges: normalizedEdges, unknown_edges: unknownEdges };
  return { ...serializable, fingerprint: digest(serializable), _nodes: nodes, _adjacency: adjacency, _reverseAdjacency: reverseAdjacency };
}

export function planImpactClosure({ graph, changedNodes, unknownPolicy = "expand-or-stop", expansionLimit = 10000 }) {
  if (!graph?._nodes || !graph?._adjacency || !graph?._reverseAdjacency) throw new Error("IMPACT_GRAPH_REQUIRED");
  if (!Array.isArray(changedNodes) || changedNodes.length === 0) throw new Error("CHANGED_NODES_REQUIRED");
  if (!new Set(["expand-or-stop", "stop"]).has(unknownPolicy)) throw new Error("UNKNOWN_IMPACT_POLICY_INVALID");
  const missing = changedNodes.filter((id) => !graph._nodes.has(id));
  const hasUnknown = missing.length > 0 || graph.unknown_edges.length > 0;
  if (hasUnknown && unknownPolicy === "stop") return { decision: "STOP", code: "UNKNOWN_IMPACT", unknown_nodes: missing, unknown_edges: graph.unknown_edges };
  if (hasUnknown && graph._nodes.size > expansionLimit) return { decision: "STOP", code: "IMPACT_EXPANSION_LIMIT", unknown_nodes: missing, unknown_edges: graph.unknown_edges };
  const visited = new Set(hasUnknown ? [...graph._nodes.keys()] : changedNodes);
  const queue = hasUnknown ? [] : [...changedNodes].sort();
  while (queue.length) {
    const current = queue.shift();
    for (const target of graph._adjacency.get(current) ?? []) {
      if (!visited.has(target)) { visited.add(target); queue.push(target); }
    }
  }
  const impacted = [...visited].sort();
  const kinds = Object.fromEntries(KINDS.map((kind) => [kind, impacted.filter((id) => graph._nodes.get(id)?.kind === kind)]));
  const requiredChecks = [...kinds.check, ...kinds.aggregate, ...kinds.ci_job].sort();
  const evidence = kinds.evidence_type;
  const requirements = kinds.requirement;
  const traceability = requirements.map((requirementId) => ({ requirement_id: requirementId, has_evidence: reachableEvidence(graph, requirementId).length > 0, evidence_ids: reachableEvidence(graph, requirementId) }));
  const missingEvidence = traceability.filter((entry) => !entry.has_evidence).map((entry) => entry.requirement_id);
  const untracedChanges = hasUnknown ? [] : changedNodes.filter((id) => requirementAncestors(graph, id).length === 0);
  const stopped = missingEvidence.length > 0 || untracedChanges.length > 0;
  return { decision: stopped ? "STOP" : "PASS", code: missingEvidence.length ? "MISSING_REQUIREMENT_EVIDENCE" : untracedChanges.length ? "CHANGED_NODE_WITHOUT_REQUIREMENT" : "IMPACT_CLOSED", changed_nodes: [...changedNodes].sort(), impacted_nodes: impacted, expanded_unknown: hasUnknown, required_checks: requiredChecks, evidence_types: evidence, traceability, missing_evidence: missingEvidence, untraced_changes: untracedChanges.sort(), fingerprint: digest({ graph: graph.fingerprint, changedNodes: [...changedNodes].sort(), impacted }) };
}

function requirementAncestors(graph, start) {
  const found = new Set();
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    if (graph._nodes.get(current)?.kind === "requirement") found.add(current);
    for (const source of graph._reverseAdjacency.get(current) ?? []) if (!visited.has(source)) {
      visited.add(source);
      queue.push(source);
    }
  }
  return [...found].sort();
}

function reachableEvidence(graph, start) {
  const found = new Set();
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const target of graph._adjacency.get(current) ?? []) {
      if (!visited.has(target)) { visited.add(target); queue.push(target); }
      if (graph._nodes.get(target)?.kind === "evidence_type") found.add(target);
    }
  }
  return [...found].sort();
}

function normalizeSlices(slices, dependencies, ownership, locks) {
  const dependencyMap = new Map();
  for (const dependency of dependencies ?? []) {
    if (!dependencyMap.has(dependency.slice)) dependencyMap.set(dependency.slice, []);
    dependencyMap.get(dependency.slice).push(dependency.depends_on);
  }
  return slices.map((slice) => {
    if (!slice || typeof slice.id !== "string" || !Number.isFinite(slice.duration) || slice.duration <= 0 || typeof slice.owner !== "string" || slice.owner.length === 0) throw new Error("SCHEDULE_SLICE_INVALID");
    const resources = { ...(slice.resources ?? {}) };
    if (Object.entries(resources).some(([key, amount]) => typeof key !== "string" || key.length === 0 || !Number.isFinite(amount) || amount < 0)) throw new Error("SCHEDULE_RESOURCE_INVALID");
    return {
      ...slice,
      depends_on: [...new Set([...(slice.depends_on ?? []), ...(dependencyMap.get(slice.id) ?? [])])].sort(),
      files: [...new Set([...(slice.files ?? []), ...((ownership ?? []).filter((entry) => entry.slice === slice.id).flatMap((entry) => entry.files ?? []))])].sort(),
      locks: [...new Set([...(slice.locks ?? []), ...((locks ?? []).filter((entry) => entry.slice === slice.id).map((entry) => entry.lock))])].sort(),
      resources
    };
  });
}

function pathsOverlap(left, right) {
  const normalize = (value) => value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function conflicts(a, b) {
  const writesOverlap = a.writes !== false && b.writes !== false && a.files.some((file) => b.files.some((other) => pathsOverlap(file, other)));
  return writesOverlap || a.locks.some((lock) => b.locks.includes(lock)) || (a.owner === b.owner && (a.writes !== false || b.writes !== false));
}

function criticalLengths(items, byId) {
  const dependents = new Map(items.map((item) => [item.id, []]));
  for (const item of items) for (const parent of item.depends_on) dependents.get(parent)?.push(item.id);
  const memo = new Map();
  function visit(id, stack = new Set()) {
    if (memo.has(id)) return memo.get(id);
    if (stack.has(id)) throw new Error("SCHEDULE_DEPENDENCY_CYCLE");
    stack.add(id);
    const value = byId.get(id).duration + Math.max(0, ...(dependents.get(id) ?? []).map((child) => visit(child, new Set(stack))));
    memo.set(id, value);
    return value;
  }
  for (const item of items) visit(item.id);
  return memo;
}

export function scheduleSlices({ slices, dependencies = [], ownership = [], locks = [], limits = {} }) {
  if (!Array.isArray(slices) || slices.length === 0) throw new Error("SCHEDULE_SLICES_REQUIRED");
  const items = normalizeSlices(slices, dependencies, ownership, locks);
  const byId = new Map(items.map((item) => [item.id, item]));
  if (byId.size !== items.length) throw new Error("SCHEDULE_SLICE_DUPLICATE");
  for (const item of items) for (const parent of item.depends_on) if (!byId.has(parent)) throw new Error(`SCHEDULE_DEPENDENCY_UNKNOWN:${parent}`);
  const critical = criticalLengths(items, byId);
  const completed = new Set();
  const batches = [];
  const maxParallel = limits.max_parallel ?? 1;
  if (!Number.isInteger(maxParallel) || maxParallel < 1) throw new Error("SCHEDULE_PARALLEL_LIMIT_INVALID");
  if (limits.resources !== undefined && (!limits.resources || typeof limits.resources !== "object" || Array.isArray(limits.resources) || Object.entries(limits.resources).some(([key, value]) => typeof key !== "string" || key.length === 0 || !Number.isFinite(value) || value < 0))) throw new Error("SCHEDULE_RESOURCE_LIMIT_INVALID");
  while (completed.size < items.length) {
    const ready = items.filter((item) => !completed.has(item.id) && item.depends_on.every((id) => completed.has(id))).sort((a, b) => critical.get(b.id) - critical.get(a.id) || a.id.localeCompare(b.id));
    if (ready.length === 0) throw new Error("SCHEDULE_DEPENDENCY_CYCLE");
    const batch = [];
    const resourceUse = {};
    for (const candidate of ready) {
      if (batch.length >= maxParallel || batch.some((item) => conflicts(item, candidate))) continue;
      const over = Object.entries(candidate.resources).some(([key, amount]) => Number.isFinite(limits.resources?.[key]) && (resourceUse[key] ?? 0) + amount > limits.resources[key]);
      if (over) continue;
      batch.push(candidate);
      for (const [key, amount] of Object.entries(candidate.resources)) resourceUse[key] = (resourceUse[key] ?? 0) + amount;
    }
    if (batch.length === 0) {
      const blocked = ready[0];
      const individuallyOver = Object.entries(blocked.resources).some(([key, amount]) => Number.isFinite(limits.resources?.[key]) && amount > limits.resources[key]);
      if (individuallyOver) throw new Error(`SCHEDULE_RESOURCE_UNSATISFIABLE:${blocked.id}`);
      batch.push(blocked);
    }
    batches.push({ index: batches.length, slices: batch.map((item) => item.id), duration: Math.max(...batch.map((item) => item.duration)), resources: resourceUse });
    batch.forEach((item) => completed.add(item.id));
  }
  return { batches, order: batches.flatMap((batch) => batch.slices), critical_path: [...critical.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, length]) => ({ id, remaining_duration: length })), fingerprint: digest(batches) };
}

export function selectReviewCoverage({ requiredPerspectives, candidates }) {
  if (!Array.isArray(requiredPerspectives) || requiredPerspectives.length === 0) throw new Error("REVIEW_PERSPECTIVES_REQUIRED");
  if (!Array.isArray(candidates) || candidates.length === 0 || candidates.length > 20) throw new Error("REVIEW_CANDIDATES_INVALID");
  const required = [...new Set(requiredPerspectives)].sort();
  const eligible = candidates.filter((candidate) => candidate.independent === true && candidate.writer !== true).map((candidate) => ({ ...candidate, perspectives: [...new Set(candidate.perspectives ?? [])].sort(), cost: candidate.cost ?? 1 })).sort((a, b) => a.id.localeCompare(b.id));
  let best;
  for (let mask = 1; mask < 2 ** eligible.length; mask += 1) {
    const selected = eligible.filter((_, index) => (mask & (1 << index)) !== 0);
    const covered = new Set(selected.flatMap((candidate) => candidate.perspectives));
    if (!required.every((perspective) => covered.has(perspective))) continue;
    const score = [selected.length, selected.reduce((sum, candidate) => sum + candidate.cost, 0), selected.map((candidate) => candidate.id).join(",")];
    if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2])))) best = { selected, score };
  }
  if (!best) return { decision: "STOP", code: "MISSING_REVIEW_PERSPECTIVE", missing: required.filter((perspective) => !eligible.some((candidate) => candidate.perspectives.includes(perspective))) };
  return { decision: "PASS", selected: best.selected.map((candidate) => candidate.id), perspectives: required, total_cost: best.score[1], fingerprint: digest(best.selected.map((candidate) => candidate.id)) };
}

export function generateContractProjection({ schemaId, owner, fields }) {
  if (typeof schemaId !== "string" || typeof owner !== "string" || !Array.isArray(fields)) throw new Error("PROJECTION_INPUT_INVALID");
  const unique = [...new Set(fields)].sort();
  const projection = { schema_version: "1.0.0", schema_id: schemaId, owner, generated: true, authoritative: false, fields: unique };
  return { ...projection, fingerprint: digest(projection) };
}
