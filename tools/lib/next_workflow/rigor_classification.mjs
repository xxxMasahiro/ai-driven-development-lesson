import { createHash } from "node:crypto";
import path from "node:path";
import { RIGOR_HARD_L5_TRIGGERS } from "./contracts.mjs";

export const HEADLESS_OPERATION_CLASSES = Object.freeze([
  "read",
  "edit_text",
  "edit_code",
  "edit_configuration",
  "security_control",
  "authentication",
  "secret_material",
  "permission_boundary",
  "delete_or_destroy",
  "history_rewrite",
  "ci_or_safety_gate",
  "external_repository_write",
  "data_migration",
  "breaking_compatibility",
]);

const OPERATION_SET = new Set(HEADLESS_OPERATION_CLASSES);
const HARD_TRIGGER_SET = new Set(RIGOR_HARD_L5_TRIGGERS);
const RISK_SCORE = Object.freeze({ low: 0, normal: 1, high: 2, critical: 2 });
const COMPLEXITY_SCORE = Object.freeze({ low: 0, normal: 1, high: 2, extreme: 2 });
const RISK_ORDER = Object.freeze(["low", "normal", "high", "critical"]);
const COMPLEXITY_ORDER = Object.freeze(["low", "normal", "high", "extreme"]);
const SCORE_IDS = Object.freeze([
  "user_impact",
  "change_scope",
  "recoverability",
  "uncertainty",
  "verification_difficulty",
  "permission_boundary_impact",
]);

const OPERATION_TRIGGER = Object.freeze({
  security_control: "security",
  authentication: "authentication",
  secret_material: "secrets",
  permission_boundary: "permissions",
  delete_or_destroy: "destructive_operation",
  history_rewrite: "history_rewrite",
  ci_or_safety_gate: "ci_or_safety_gate_change",
  external_repository_write: "external_repository_write",
  data_migration: "data_migration",
  breaking_compatibility: "breaking_compatibility",
});

const TRIGGER_OPERATION = Object.freeze(Object.fromEntries(
  Object.entries(OPERATION_TRIGGER).map(([operation, trigger]) => [trigger, operation]),
));

const OPERATION_SCORE_FLOORS = Object.freeze({
  read: {},
  edit_text: {},
  edit_code: { change_scope: 1, verification_difficulty: 1 },
  edit_configuration: { change_scope: 1, uncertainty: 1, verification_difficulty: 2 },
  security_control: { user_impact: 2, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 2 },
  authentication: { user_impact: 2, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 2 },
  secret_material: { user_impact: 2, recoverability: 1, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 2 },
  permission_boundary: { user_impact: 2, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 2 },
  delete_or_destroy: { user_impact: 2, recoverability: 2, verification_difficulty: 2 },
  history_rewrite: { user_impact: 2, recoverability: 2, uncertainty: 1, verification_difficulty: 2 },
  ci_or_safety_gate: { user_impact: 2, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 1 },
  external_repository_write: { user_impact: 2, recoverability: 1, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 2 },
  data_migration: { user_impact: 2, recoverability: 2, uncertainty: 1, verification_difficulty: 2 },
  breaking_compatibility: { user_impact: 2, recoverability: 2, uncertainty: 1, verification_difficulty: 2 },
});

const PATH_SCORE_FLOORS = Object.freeze({
  content: {},
  runtime: { change_scope: 1, verification_difficulty: 1 },
  configuration: { change_scope: 1, uncertainty: 1, verification_difficulty: 2 },
  authority: { user_impact: 1, change_scope: 1, uncertainty: 1, verification_difficulty: 2, permission_boundary_impact: 1 },
  unknown: { uncertainty: 2, verification_difficulty: 2 },
});

const CONTENT_EXTENSIONS = new Set([".adoc", ".htm", ".html", ".md", ".mdx", ".rst", ".txt"]);
const CODE_EXTENSIONS = new Set([
  ".c", ".cc", ".cjs", ".cpp", ".cs", ".go", ".java", ".js", ".jsx", ".kt", ".mjs",
  ".php", ".py", ".rb", ".rs", ".sh", ".swift", ".ts", ".tsx",
]);
const CONFIGURATION_EXTENSIONS = new Set([
  ".cfg", ".conf", ".env", ".ini", ".json", ".jsonl", ".properties", ".toml", ".tsv", ".xml", ".yaml", ".yml",
]);
const AUTHORITY_BASENAMES = new Set(["agents.md", "agent.md", "skill.md"]);
const AUTHORITY_PREFIXES = Object.freeze([
  ".git/",
  ".github/",
  ".githooks/",
  "docs/workflow/",
  "learning/next_workflow_",
]);
const RUNTIME_PREFIXES = Object.freeze(["tools/", "scripts/", "src/", "lib/"]);

const DETECTORS = Object.freeze([
  {
    id: "en_security_v1",
    trigger: "security",
    locale: "en",
    patterns: [/\b(?:security|secure|vulnerabilit(?:y|ies)|threat|encryption)\b/u],
  },
  {
    id: "ja_security_v1",
    trigger: "security",
    locale: "ja",
    patterns: [/(?:セキュリティ|安全性|脆弱性|脅威|暗号)/u],
  },
  {
    id: "en_authentication_v1",
    trigger: "authentication",
    locale: "en",
    patterns: [/\b(?:auth|authentication|authenticate|login|oauth|sso)\b/u],
  },
  {
    id: "ja_authentication_v1",
    trigger: "authentication",
    locale: "ja",
    patterns: [/(?:認証|ログイン|オーオース)/u],
  },
  {
    id: "en_secrets_v1",
    trigger: "secrets",
    locale: "en",
    patterns: [/\b(?:secret|secrets|credential|credentials|password|token|api[ _-]?key|access[ _-]?token)\b/u],
  },
  {
    id: "ja_secrets_v1",
    trigger: "secrets",
    locale: "ja",
    patterns: [/(?:秘密|シークレット|認証情報|資格情報|クレデンシャル|パスワード|トークン|api[ _-]?キー|アクセストークン)/u],
  },
  {
    id: "en_permissions_v1",
    trigger: "permissions",
    locale: "en",
    patterns: [/\b(?:permission|permissions|authorization|access control|privilege|privileges|sandbox)\b/u],
  },
  {
    id: "ja_permissions_v1",
    trigger: "permissions",
    locale: "ja",
    patterns: [/(?:権限|認可|アクセス制御|特権|サンドボックス)/u],
  },
  {
    id: "en_destructive_v1",
    trigger: "destructive_operation",
    locale: "en",
    patterns: [/\b(?:delete|deletion|remove|removal|destroy|purge|truncate)\b/u],
  },
  {
    id: "ja_destructive_v1",
    trigger: "destructive_operation",
    locale: "ja",
    patterns: [/(?:削除|消去|消す|取り除|除去|破棄|廃棄|全消し)/u],
  },
  {
    id: "en_history_rewrite_v1",
    trigger: "history_rewrite",
    locale: "en",
    patterns: [/\b(?:history rewrite|force[ -]?push|rebase)\b/u],
  },
  {
    id: "ja_history_rewrite_v1",
    trigger: "history_rewrite",
    locale: "ja",
    patterns: [/(?:履歴(?:を)?書き換|履歴改変|強制プッシュ|リベース)/u],
  },
  {
    id: "en_ci_safety_gate_v1",
    trigger: "ci_or_safety_gate_change",
    locale: "en",
    patterns: [/\bci\b|\b(?:safety|release|quality) gate\b/u],
  },
  {
    id: "ja_ci_safety_gate_v1",
    trigger: "ci_or_safety_gate_change",
    locale: "ja",
    patterns: [/(?:継続的インテグレーション|安全ゲート|リリースゲート|品質ゲート)/u],
  },
  {
    id: "en_external_repository_write_v1",
    trigger: "external_repository_write",
    locale: "en",
    patterns: [/\b(?:push|pull request|merge|external repository)\b|\bpr\b/u],
  },
  {
    id: "ja_external_repository_write_v1",
    trigger: "external_repository_write",
    locale: "ja",
    patterns: [/(?:プッシュ|プルリクエスト|マージ|外部リポジトリ)/u],
  },
  {
    id: "en_data_migration_v1",
    trigger: "data_migration",
    locale: "en",
    patterns: [/\b(?:migration|migrate|schema change|database upgrade)\b/u],
  },
  {
    id: "ja_data_migration_v1",
    trigger: "data_migration",
    locale: "ja",
    patterns: [/(?:データ移行|マイグレーション|スキーマ変更|データベース更新)/u],
  },
  {
    id: "en_breaking_compatibility_v1",
    trigger: "breaking_compatibility",
    locale: "en",
    patterns: [/\b(?:breaking|incompatible|compatibility break)\b/u],
  },
  {
    id: "ja_breaking_compatibility_v1",
    trigger: "breaking_compatibility",
    locale: "ja",
    patterns: [/(?:破壊的変更|互換性(?:を)?(?:破壊|壊)|非互換)/u],
  },
]);

const CLASSIFICATION_POLICY = Object.freeze({
  schema_version: "1.0.0",
  normalization: "unicode_nfkc_lowercase_v1",
  operation_classes: HEADLESS_OPERATION_CLASSES,
  operation_trigger: OPERATION_TRIGGER,
  operation_score_floors: OPERATION_SCORE_FLOORS,
  path_score_floors: PATH_SCORE_FLOORS,
  detectors: DETECTORS.map((detector) => ({
    id: detector.id,
    trigger: detector.trigger,
    locale: detector.locale,
    patterns: detector.patterns.map((pattern) => pattern.source),
  })),
  unknown_policy: "l5_stop_before_topology_or_model_selection",
  legacy_l1_policy: "bounded_content_read_or_edit_text_only",
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

export const RIGOR_CLASSIFICATION_POLICY_FINGERPRINT = digest(CLASSIFICATION_POLICY);

export function normalizeClassificationText(value) {
  if (typeof value !== "string") throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
  return value.normalize("NFKC").toLowerCase();
}

export function normalizeHeadlessOperations(value, code = "HEADLESS_TASK_OPERATIONS_INVALID") {
  if (value === undefined) return [];
  if (!Array.isArray(value)
    || value.length > HEADLESS_OPERATION_CLASSES.length
    || value.some((entry) => typeof entry !== "string" || !OPERATION_SET.has(entry))
    || new Set(value).size !== value.length) throw new Error(code);
  return [...value].sort();
}

function pathClass(scopePath) {
  const normalized = normalizeClassificationText(scopePath);
  const basename = path.posix.basename(normalized);
  if (AUTHORITY_BASENAMES.has(basename) || AUTHORITY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "authority";
  const extension = path.posix.extname(normalized);
  if (CONFIGURATION_EXTENSIONS.has(extension) || basename === "dockerfile" || basename === "makefile") return "configuration";
  if (CODE_EXTENSIONS.has(extension) || RUNTIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "runtime";
  if (CONTENT_EXTENSIONS.has(extension)) return "content";
  return "unknown";
}

function applyFloors(scores, floors) {
  for (const [scoreId, floor] of Object.entries(floors)) scores[scoreId] = Math.max(scores[scoreId], floor);
}

function sourceFragments({ summary, scopePaths, tasks }) {
  const fragments = [];
  let totalBytes = 0;
  const append = (source, value) => {
    const normalized = normalizeClassificationText(value);
    const bytes = Buffer.byteLength(normalized);
    if (bytes > 16 * 1024 || totalBytes + bytes + 1 > 64 * 1024) throw new Error("HEADLESS_TASK_CLASSIFICATION_INPUT_TOO_LARGE");
    totalBytes += bytes + 1;
    fragments.push({ source, normalized });
  };
  append("task.summary", summary);
  for (const scopePath of scopePaths) append(`task.scope_paths:${scopePath}`, scopePath);
  for (const task of tasks) {
    append(`task.tasks:${task.task_id}:summary`, task.summary);
    for (const scopePath of task.scope_paths) append(`task.tasks:${task.task_id}:scope_paths:${scopePath}`, scopePath);
    for (let index = 0; index < task.data.length; index += 1) {
      let serialized;
      try {
        serialized = JSON.stringify(task.data[index]);
      } catch {
        throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
      }
      if (typeof serialized !== "string") throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
      append(`task.tasks:${task.task_id}:data:${index}`, serialized);
    }
  }
  return fragments;
}

function detectTextEvidence(fragments) {
  const evidence = [];
  for (const detector of DETECTORS) {
    for (const fragment of fragments) {
      if (detector.patterns.some((pattern) => pattern.test(fragment.normalized))) {
        evidence.push({
          detector_id: detector.id,
          locale: detector.locale,
          trigger: detector.trigger,
          source: fragment.source,
          normalized_text_fingerprint: digest(fragment.normalized),
        });
      }
    }
  }
  return evidence.sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function legacyContentIntent(summary) {
  const normalized = normalizeClassificationText(summary);
  const englishObject = /\b(?:title|heading|text|wording|copy|typo|spelling)\b/u;
  const englishRead = /\b(?:read|review|summari[sz]e|inspect)\b/u;
  const englishEdit = /\b(?:change|update|edit|correct|fix|rename)\b/u;
  const japaneseObject = /(?:タイトル|見出し|文章|文言|テキスト|誤字|表記)/u;
  const japaneseRead = /(?:読む|確認|要約|レビュー)/u;
  const japaneseEdit = /(?:変更|修正|更新|編集|直す)/u;
  if ((englishObject.test(normalized) && englishRead.test(normalized))
    || (japaneseObject.test(normalized) && japaneseRead.test(normalized))) return "read";
  if ((englishObject.test(normalized) && englishEdit.test(normalized))
    || (japaneseObject.test(normalized) && japaneseEdit.test(normalized))) return "edit_text";
  return null;
}

function coversPath(rootPaths, childPath) {
  return rootPaths.some((rootPath) => childPath === rootPath || childPath.startsWith(`${rootPath}/`));
}

function operationPathMismatch(pathKind, operations) {
  if (pathKind === "content") return operations.includes("edit_code") || operations.includes("edit_configuration");
  if (pathKind === "runtime") return operations.includes("edit_text") || operations.includes("edit_configuration");
  if (pathKind === "configuration" || pathKind === "authority") return operations.includes("edit_text") || operations.includes("edit_code");
  return false;
}

function raisedLabel(order, callerMinimum, automaticScore) {
  const automatic = automaticScore >= 2 ? order[2] : automaticScore === 1 ? order[1] : order[0];
  return order[Math.max(order.indexOf(callerMinimum), order.indexOf(automatic))];
}

export function classifyHeadlessTaskImpact({
  schemaVersion,
  summary,
  scopePaths,
  operations,
  tasks,
  explicitSignals,
  riskMinimum,
  complexityMinimum,
} = {}) {
  const rootOperations = normalizeHeadlessOperations(operations);
  const fragments = sourceFragments({ summary, scopePaths, tasks });
  const textEvidence = detectTextEvidence(fragments);
  const textTriggers = [...new Set(textEvidence.map((entry) => entry.trigger))].sort();
  const structuredOperations = [...new Set([
    ...rootOperations,
    ...tasks.flatMap((task) => task.operations),
  ])].sort();
  const structuredTriggers = structuredOperations.map((operation) => OPERATION_TRIGGER[operation]).filter(Boolean);
  const hardTriggers = new Set([...structuredTriggers, ...textTriggers, ...explicitSignals]);
  const unknownReasons = new Set();

  const rootPathEvidence = scopePaths.map((scopePath) => {
    const classification = pathClass(scopePath);
    return { path: scopePath, class: classification, policy_id: `${classification}_path_v1` };
  });
  const childPathEvidence = tasks.flatMap((task) => task.scope_paths.map((scopePath) => {
    const classification = pathClass(scopePath);
    return {
      task_id: task.task_id,
      path: scopePath,
      class: classification,
      policy_id: `${classification}_path_v1`,
    };
  }));
  const allPathEvidence = [...rootPathEvidence, ...childPathEvidence];

  if (schemaVersion === "1.1.0") {
    if (rootOperations.length === 0) unknownReasons.add("root_operations_missing");
    for (const task of tasks) {
      if (task.operations.length === 0) unknownReasons.add(`child_operations_missing:${task.task_id}`);
      if (task.data.length > 0) unknownReasons.add(`untyped_child_data:${task.task_id}`);
      for (const childPath of task.scope_paths) {
        if (!coversPath(scopePaths, childPath)) unknownReasons.add(`child_scope_outside_root:${task.task_id}:${childPath}`);
      }
    }
    for (const evidence of allPathEvidence) {
      const applicable = evidence.task_id === undefined
        ? rootOperations
        : tasks.find((task) => task.task_id === evidence.task_id)?.operations ?? [];
      if (evidence.class === "unknown") unknownReasons.add(`path_unclassified:${evidence.path}`);
      else if (operationPathMismatch(evidence.class, applicable)) unknownReasons.add(`path_operation_mismatch:${evidence.path}`);
    }
    for (const evidence of textEvidence) {
      const taskMatch = /^task\.tasks:([^:]+):/u.exec(evidence.source);
      const applicable = taskMatch
        ? tasks.find((task) => task.task_id === taskMatch[1])?.operations ?? []
        : rootOperations;
      const requiredOperation = TRIGGER_OPERATION[evidence.trigger];
      if (requiredOperation && !applicable.includes(requiredOperation)) {
        unknownReasons.add(`structured_text_contradiction:${evidence.trigger}`);
      }
    }
    for (const trigger of explicitSignals) {
      if (trigger === "unknown_impact") continue;
      const requiredOperation = TRIGGER_OPERATION[trigger];
      if (requiredOperation && !rootOperations.includes(requiredOperation)) {
        unknownReasons.add(`structured_signal_contradiction:${trigger}`);
      }
    }
  } else {
    const legacyIntent = legacyContentIntent(summary);
    const legacyContentOnly = tasks.length === 0
      && scopePaths.every((scopePath) => pathClass(scopePath) === "content")
      && legacyIntent !== null
      && textTriggers.length === 0
      && explicitSignals.length === 0;
    if (legacyContentOnly) rootOperations.push(legacyIntent);
    else unknownReasons.add("legacy_impact_evidence_incomplete");
  }

  if (explicitSignals.includes("unknown_impact")) unknownReasons.add("explicit_unknown_impact");
  if (unknownReasons.size > 0) hardTriggers.add("unknown_impact");

  const scores = Object.fromEntries(SCORE_IDS.map((scoreId) => [scoreId, 0]));
  for (const operation of [...new Set([...rootOperations, ...structuredOperations])]) {
    applyFloors(scores, OPERATION_SCORE_FLOORS[operation] ?? {});
  }
  for (const evidence of allPathEvidence) applyFloors(scores, PATH_SCORE_FLOORS[evidence.class]);
  if (allPathEvidence.length > 3) scores.change_scope = Math.max(scores.change_scope, 2);
  else if (allPathEvidence.length > 1) scores.change_scope = Math.max(scores.change_scope, 1);
  scores.user_impact = Math.max(scores.user_impact, RISK_SCORE[riskMinimum]);
  if (RISK_SCORE[riskMinimum] > 1) scores.recoverability = Math.max(scores.recoverability, 1);
  scores.change_scope = Math.max(scores.change_scope, COMPLEXITY_SCORE[complexityMinimum]);
  scores.uncertainty = Math.max(scores.uncertainty, COMPLEXITY_SCORE[complexityMinimum]);
  scores.verification_difficulty = Math.max(scores.verification_difficulty, COMPLEXITY_SCORE[complexityMinimum]);
  if (unknownReasons.size > 0) {
    scores.uncertainty = 2;
    scores.verification_difficulty = 2;
  }

  const triggers = [...hardTriggers].filter((trigger) => HARD_TRIGGER_SET.has(trigger)).sort();
  const hardTriggerEvidence = {};
  for (const trigger of triggers) {
    const sources = [];
    for (const operation of structuredOperations) {
      if (OPERATION_TRIGGER[operation] === trigger) sources.push(`structured_operation:${operation}`);
    }
    for (const evidence of textEvidence) {
      if (evidence.trigger === trigger) sources.push(`normalized_text_detector:${evidence.detector_id}:${evidence.source}`);
    }
    if (explicitSignals.includes(trigger)) sources.push(`task.change_signals:${trigger}`);
    if (trigger === "unknown_impact") {
      for (const reason of [...unknownReasons].sort()) sources.push(`impact_coverage:${reason}`);
    }
    hardTriggerEvidence[trigger] = [...new Set(sources)].sort().join("|");
  }

  const scoreReasons = {
    user_impact: `automatic operation/path floor with developer risk minimum:${riskMinimum}`,
    change_scope: `automatic operation/path/count floor with developer complexity minimum:${complexityMinimum}`,
    recoverability: `automatic operation floor with developer risk minimum:${riskMinimum}`,
    uncertainty: `automatic operation/path/coverage floor with developer complexity minimum:${complexityMinimum}`,
    verification_difficulty: `automatic operation/path/coverage floor with developer complexity minimum:${complexityMinimum}`,
    permission_boundary_impact: "automatic structured-operation and protected-path floor",
  };
  const automaticRiskScore = Math.max(scores.user_impact, scores.recoverability, scores.permission_boundary_impact);
  const automaticComplexityScore = Math.max(scores.change_scope, scores.uncertainty, scores.verification_difficulty);
  const effectiveRisk = raisedLabel(RISK_ORDER, riskMinimum, automaticRiskScore);
  const effectiveComplexity = raisedLabel(COMPLEXITY_ORDER, complexityMinimum, automaticComplexityScore);
  const classificationInput = {
    schema_version: schemaVersion,
    summary,
    scope_paths: scopePaths,
    operations: rootOperations,
    tasks: tasks.map((task) => ({
      task_id: task.task_id,
      summary: task.summary,
      scope_paths: task.scope_paths,
      operations: task.operations,
      data: task.data,
    })),
    explicit_signals: explicitSignals,
    developer_minimum_risk: riskMinimum,
    developer_minimum_complexity: complexityMinimum,
  };

  return {
    scores,
    scoreReasons,
    hardTriggers: triggers,
    hardTriggerEvidence,
    effectiveRisk,
    effectiveComplexity,
    impactAssessment: {
      schema_version: "1.0.0",
      schema_id: "ImpactAssessment@1",
      status: unknownReasons.size === 0 ? "known" : "unknown",
      hard_triggers: triggers,
      root_operations: [...new Set(rootOperations)].sort(),
      child_operations: tasks.map((task) => ({ task_id: task.task_id, operations: task.operations })),
      covered_root_paths: rootPathEvidence,
      covered_child_paths: childPathEvidence,
      normalization: "unicode_nfkc_lowercase_v1",
      normalized_text_evidence: textEvidence,
      unknown_reasons: [...unknownReasons].sort(),
      score_floors: scores,
      score_reasons: scoreReasons,
      classification_input_fingerprint: digest(classificationInput),
      policy_fingerprint: RIGOR_CLASSIFICATION_POLICY_FINGERPRINT,
    },
  };
}
