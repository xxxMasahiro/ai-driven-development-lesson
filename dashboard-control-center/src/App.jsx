import {
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowRightCircle,
  BadgeAlert,
  BookOpen,
  BookMarked,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsRight,
  CircleAlert,
  CircleDashed,
  CircleHelp,
  CircleMinus,
  CircleX,
  ClipboardCheck,
  Clock,
  Code2,
  Compass,
  Copy,
  Database,
  Eye,
  ExternalLink,
  File,
  FileCheck2,
  FileJson,
  FileSearch,
  FileText,
  Flag,
  Folder,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Globe2,
  GraduationCap,
  Home,
  Info,
  KeyRound,
  Link2,
  List,
  ListChecks,
  Lock,
  Pencil,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Settings,
  User,
  UserCheck,
  TerminalSquare,
  Target,
  TrendingUp,
  Waypoints,
  Wrench,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyDashboardSettingChange,
  applyDashboardDesignSystemChange,
  asArray,
  displayKey,
  displayText,
  fetchDashboardDataSnapshot,
  fetchDashboardLiveStatus,
  normalizeRisk,
  normalizeState,
  objectEntries,
  pickFirst,
  planDashboardSettingChange,
  planDashboardDesignSystemChange,
} from "./dashboardData.js";
import {
  availableContexts,
  availableContextForMenu,
  contextDataForMenu,
  initialDashboardMenuId,
  isAvailableContextSelectable,
  isMenuSelectable,
  persistDashboardMenuId,
  producerMenuIdForData,
  resolveActiveDashboardData,
  resolveActiveMenuId,
  selectedContextData,
  unavailableContextNotice,
} from "./dashboardContext.js";
import { DetailDecisionSummary, ProducerDecisionSummary } from "./DecisionSummary.jsx";
import { dashboardControlCenterDesignSystem } from "./design-system.generated.js";
import { displayDepthPolicyForData } from "./displayDepth.js";
import { createTranslator, formatDateTime, formatRelativeAge, getDashboardIntlLocale, getDashboardLocaleDirection, resolveLocale } from "./i18n.js";

const stateIcons = {
  ready: CheckCircle2,
  passed: CheckCircle2,
  failed: CircleX,
  blocked: BadgeAlert,
  missing: CircleHelp,
  unknown: CircleHelp,
  optional: Info,
  cached: RefreshCw,
  not_run: CircleDashed,
  stale: Clock,
  approval_required: CircleAlert,
  manual_required: UserCheck,
  not_applicable: CircleMinus,
};

const reviewStates = new Set(["failed", "blocked", "approval_required", "manual_required", "missing", "unknown", "optional", "cached", "not_run", "stale"]);

const statePriority = {
  blocked: 0,
  failed: 1,
  approval_required: 2,
  manual_required: 3,
  unknown: 4,
  missing: 5,
  optional: 6,
  cached: 7,
  not_run: 8,
  stale: 9,
  ready: 10,
  passed: 11,
  not_applicable: 12,
};

function WorkflowCategoryIcon(props) {
  return <Workflow {...props} data-workflow-category-icon="true" />;
}

const navigation = [
  { id: "overview", labelKey: "nav.overview", healthKey: "health.lesson", Icon: Home, tone: "overview" },
  { id: "lessons", labelKey: "nav.lessons", healthKey: "health.lesson", Icon: BookOpen, tone: "lessons" },
  { id: "workflow", labelKey: "nav.workflow", healthKey: "health.workflow", Icon: WorkflowCategoryIcon, tone: "workflow" },
  { id: "maintenance", labelKey: "nav.maintenance", healthKey: "health.maintenance", Icon: RefreshCw, tone: "maintenance" },
  { id: "safety", labelKey: "nav.safety", healthKey: "health.security", Icon: ShieldCheck, tone: "safety" },
];

const repositoryNavigation = [
  { id: "repository-info", labelKey: "nav.repositoryInfo", Icon: Info, href: "#repository-info" },
  { id: "documents", labelKey: "nav.documents", Icon: FileText, href: "#documents" },
  { id: "settings", labelKey: "nav.settings", Icon: Settings, href: "#settings" },
  { id: "design-studio", labelKey: "nav.designStudio", Icon: Wrench, href: "#design-studio" },
];

const supportNavigation = [
  { id: "help", labelKey: "nav.help", Icon: CircleHelp, href: "#help" },
  { id: "history", labelKey: "nav.history", Icon: Clock, href: "#history" },
];

const allNavigation = [...navigation, ...repositoryNavigation, ...supportNavigation];
const evidenceBackedViews = new Set(["workflow", "maintenance", "safety", "repository-info", "documents", "design-studio", "help", "history"]);
const SETTINGS_APPLY_FEEDBACK_DELAY_MS = 350;
const SETTINGS_APPLY_FEEDBACK_AUTO_CLOSE_MS = 1200;
const SETTINGS_APPLY_FEEDBACK_TIMEOUT_MS = 8000;
const CONTEXT_SWITCH_FALLBACK_MS = 1200;
const CONTEXT_SWITCH_COMPLETE_HOLD_MS = 700;

const contextMenuIcons = {
  step_1_7: BookOpen,
  step_1_14: BookOpen,
  advanced: GraduationCap,
  "free-development": Code2,
  "product-improvement": TrendingUp,
  "external-integration": Globe2,
  "lesson-repository-improvement": Pencil,
  unknown: CircleHelp,
};

const contextMenuTones = {
  step_1_7: "lesson-soft",
  step_1_14: "lesson",
  advanced: "advanced",
  "free-development": "code",
  "product-improvement": "improve",
  "external-integration": "external",
  "lesson-repository-improvement": "authoring",
  unknown: "unknown",
};

const overviewStatusConfig = {
  lessons: { Icon: BookOpen, tone: "lessons", labelKey: "overview.status.lessonProgress" },
  workflow: { Icon: WorkflowCategoryIcon, tone: "workflow", labelKey: "overview.status.workflowContext" },
  git: { Icon: Link2, tone: "git", labelKey: "overview.status.git" },
  ci: { Icon: CheckCircle2, tone: "ci", labelKey: "overview.status.ci" },
  security: { Icon: ShieldCheck, tone: "security", labelKey: "overview.status.security" },
};

function viewFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return allNavigation.some((item) => item.id === hash) ? hash : "overview";
}

function StatusPill({ value, t, label, className = "" }) {
  const state = normalizeState(value);
  const Icon = stateIcons[state] || CircleDashed;
  const compactClass = state === "manual_required" ? "status--compact-label" : "";
  return (
    <span className={`status status--${state} ${compactClass} ${className}`.trim()} data-state={state}>
      <Icon aria-hidden="true" size={14} />
      {label || t(`state.${state}`, displayText(state))}
    </span>
  );
}

function RiskPill({ value, t }) {
  const risk = normalizeRisk(value);
  return (
    <span className={`risk risk--${risk}`} data-risk={risk}>
      {t(`risk.${risk}`, displayText(risk))}
    </span>
  );
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function metricUnitLabel(unit, t) {
  const normalized = displayText(unit, "items");
  return t(`summary.${normalized}`, normalized);
}

function valueState(value) {
  return normalizeState(value && typeof value === "object" ? value.status : value);
}

function isReviewState(state) {
  return reviewStates.has(normalizeState(state));
}

function compareByStatePriority(left, right) {
  return (statePriority[normalizeState(left.state)] ?? 99) - (statePriority[normalizeState(right.state)] ?? 99);
}

function metricStatusText(metric, t) {
  if (!metric) {
    return t("detail.noMetric");
  }
  return `${clampPercent(metric.percent)}% / ${metric.total ?? 0} ${metricUnitLabel(metric.unit, t)}`;
}

function technicalKeyFromId(id) {
  return String(id).replace(/_/g, ".");
}

function presentationKeyFromId(id) {
  const map = {
    "development.product_repository": "product_repo",
    "development.documents": "documents",
    "development.git_sync_status": "git_sync",
    "development.ci_status": "ci",
    "git_workflow.policy_status": "policy",
    "git_workflow.settings_status": "settings",
    "git_workflow.gate_status": "gate",
    "git_workflow.approval_status": "approval",
    as_built_sync_status: "as_built_sync",
    workflow_pair_status: "workflow_pair",
    developer_memory_status: "developer_memory",
    skills_status: "repo_local_skills",
    policy_status: "policy",
    gate_status: "gate",
    dangerous_action_approval: "approval",
  };
  return map[id] || technicalKeyFromId(id);
}

function sourcePresentationKey(source, t = null) {
  const id = displayText(source);
  const translated = t ? t(`source.label.${id}`, "") : "";
  if (translated) {
    return translated;
  }
  const map = {
    ci_required_gate: "ci.required_checks",
    workflow_pair_sync: "workflow.unknown_pair",
    security_gate: "safety.gate.blocked",
    product_ci_live: "ci.live",
    product_git_sync_live: "git_sync.live",
    as_built_sync_live: "as_built.live",
    workflow_pair_live: "workflow_pair.live",
    git_workflow_gate_live: "git_gate.live",
    product_authority_evidence_refresh: "product.evidence.refresh",
    product_security_gate_live: "safety_gate.live",
    "product.gates.evidence_index": "product.evidence",
    "product.gates.tests": "product.tests",
    "product.gates.structure": "product.structure",
    "product.security.local_artifacts": "product.security.local",
    "product.security.secrets": "product.security.secrets",
    "product.security.external_sending": "product.security.external",
  };
  const mapped = map[id] || "";
  if (mapped && t) {
    return t(`source.label.${mapped}`, mapped);
  }
  return mapped || displayKey(id);
}

function contextLabel(menuId, t) {
  const id = displayText(menuId, "unknown");
  return t(`context.menu.${id}`, displayKey(id));
}

function workflowContextLabel(workflowContext, t) {
  const id = displayText(workflowContext, "unknown");
  return t(`context.workflow.${id}`, displayKey(id));
}

function repositoryDisplayName(value, t) {
  const text = displayText(value, "");
  if (!text || text === "not_selected" || text === "not_configured" || text === "not_applicable") {
    return t("context.repositoryNotSelected");
  }
  return text;
}

function selectedContextRepositoryName(context) {
  return displayText(context?.target_repository?.name || context?.target_repository_name, "");
}

function workflowRunTarget(row, context, t) {
  return repositoryDisplayName(selectedContextRepositoryName(context) || row.target, t);
}

function securityScopeLabel(context, t) {
  const workflowContext = displayText(context.workflow_context, "unknown");
  if (workflowContext === "lesson" && displayText(context.target_repository?.path_state, "") === "configured") {
    return t("mock.context.securityScopeLessonProduct");
  }
  return workflowContextLabel(workflowContext, t);
}

function contextIconFor(menuId) {
  return contextMenuIcons[displayText(menuId, "unknown")] || contextMenuIcons.unknown;
}

function contextToneFor(menuId) {
  return contextMenuTones[displayText(menuId, "unknown")] || contextMenuTones.unknown;
}

function MenuTileLabel({ label }) {
  const text = displayText(label);
  const match = text.match(/^(STEP\s+\d+-\d+)\s+(.+)$/i);
  if (!match) {
    return text;
  }
  return (
    <>
      <span className="menu-tile__step-code">{match[1]}</span>
      <span className="menu-tile__step-name">{match[2]}</span>
    </>
  );
}

function requestDashboardSnapshotRefresh() {
  window.dispatchEvent(new CustomEvent("dashboard-control-center:refresh"));
}

function PageTitleHeader({ viewId, Icon, title, subtitle, data, locale, t, actionLabel, headingId }) {
  const generated = formatGenerated(data, locale);
  return (
    <header className={`page-title page-title--${viewId}`}>
      <div className="page-title__main">
        <span className="page-title__icon">
          <Icon aria-hidden="true" size={34} />
        </span>
        <div>
          <h2 id={headingId}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="page-title__meta">
        {generated ? (
          <span>
            <Clock aria-hidden="true" size={15} />
            {t("app.lastUpdated")}: {generated}
          </span>
        ) : null}
        {actionLabel ? (
          <button className="refresh-button" type="button" onClick={requestDashboardSnapshotRefresh}>
            <RefreshCw aria-hidden="true" size={15} />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}

function MenuTileStrip({ data, t, activeMenuId, pendingMenuId, onActiveMenuChange }) {
  const selected = displayText(activeMenuId || selectedContextData(data).menu_id, "unknown");
  const pending = displayText(pendingMenuId, "");
  const contexts = availableContexts(data);
  const [selectionNotice, setSelectionNotice] = useState(null);
  if (!contexts.length) {
    return null;
  }
  return (
    <section className="menu-tile-panel" aria-labelledby="menu-tile-heading">
      <h3 id="menu-tile-heading">{t("overview.menuTitle")}</h3>
      <div className="menu-tile-grid">
        {contexts.map((context) => {
          const menuId = displayText(context.menu_id, "unknown");
          const Icon = contextIconFor(menuId);
          const isSelected = menuId === selected;
          const isPending = menuId === pending;
          const selectable = isAvailableContextSelectable(context);
          const label = contextLabel(menuId, t);
          const showNotice = selectionNotice?.menuId === menuId;
          const describedBy = showNotice ? "menu-unavailable-notice" : undefined;
          return (
            <button
              className={`menu-tile menu-tile--${contextToneFor(menuId)}${isSelected ? " is-selected" : ""}${isPending ? " is-pending" : ""}${selectable ? "" : " is-unselectable"}`}
              type="button"
              key={menuId}
              data-menu-tile={menuId}
              data-menu-selectable={selectable ? "true" : "false"}
              aria-pressed={isSelected}
              aria-disabled={selectable ? undefined : "true"}
              aria-describedby={describedBy}
              onFocus={() => {
                if (!selectable) {
                  setSelectionNotice(unavailableContextNotice(context, t));
                }
              }}
              onClick={() => {
                if (!selectable) {
                  setSelectionNotice(unavailableContextNotice(context, t));
                  return;
                }
                setSelectionNotice(null);
                onActiveMenuChange?.(menuId);
              }}
            >
              <span className="menu-tile__icon">
                <Icon aria-hidden="true" size={30} />
              </span>
              <strong>
                <MenuTileLabel label={label} />
              </strong>
              {isSelected ? (
                <span className="menu-tile__check">
                  <Check aria-hidden="true" size={18} />
                </span>
              ) : null}
              {isPending ? (
                <span className="menu-tile__pending" aria-label={t("context.menuAvailability.switching")}>
                  <RefreshCw aria-hidden="true" size={13} />
                  {t("context.menuAvailability.switching")}
                </span>
              ) : null}
              {!selectable ? (
                <span className="menu-tile__availability">
                  <Lock aria-hidden="true" size={13} />
                  {t("context.menuAvailability.unavailable")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {selectionNotice ? (
        <div id="menu-unavailable-notice" className="menu-tile-notice" role="status" aria-live="polite">
          <strong>{selectionNotice.reason}</strong>
          <span>{selectionNotice.detail}</span>
          <span>{t("context.menuAvailability.currentRemains")} {contextLabel(selectedContextData(data).menu_id, t)}</span>
          {selectionNotice.nextAction ? <code>{selectionNotice.nextAction}</code> : null}
        </div>
      ) : null}
    </section>
  );
}

function ContextStripValue({ value, format, animateNumerator = false }) {
  const text = displayText(value, "");
  const fraction = text.match(/^(?:(Step)\s+)?(\d+)\s*\/\s*(\d+)$/i);
  if ((format === "fraction" || format === "step-fraction") && fraction) {
    const [, prefix, numerator, denominator] = fraction;
    return (
      <strong className="context-strip__value context-strip__value--fraction" aria-label={text}>
        {prefix ? <span className="context-strip__value-prefix">{prefix}</span> : null}
        {animateNumerator ? (
          <AnimatedNumber value={numerator} className="context-strip__value-numerator" />
        ) : (
          <span>{numerator}</span>
        )}
        <span className="context-strip__value-separator">/</span>
        <span className="context-strip__value-denominator">{denominator}</span>
      </strong>
    );
  }
  return <strong>{value}</strong>;
}

function AnimatedNumber({ value, duration = 720, className = "" }) {
  const target = Number(value);
  const isNumeric = Number.isFinite(target);
  const [displayValue, setDisplayValue] = useState(isNumeric ? 0 : value);
  const [running, setRunning] = useState(isNumeric);

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(value);
      setRunning(false);
      return undefined;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setDisplayValue(target);
      setRunning(false);
      return undefined;
    }

    setDisplayValue(0);
    setRunning(true);
    let frame = 0;
    const start = performance.now();
    const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayValue(Math.round(target * easeOut(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setDisplayValue(target);
      setRunning(false);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, isNumeric, target, value]);

  const classes = `animated-number${running ? " animated-number--running" : ""}${className ? ` ${className}` : ""}`;
  return <span className={classes}>{displayValue}</span>;
}

function AnimatedProgressRing({ percent, className = "", duration = 900 }) {
  const target = clampPercent(percent);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setDisplayPercent(target);
      return undefined;
    }

    setDisplayPercent(0);
    let frame = 0;
    const start = performance.now();
    const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayPercent(Math.round(target * easeOut(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setDisplayPercent(target);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return (
    <span
      className={`mini-progress-ring${className ? ` ${className}` : ""}`}
      style={{ "--metric-percent": `${displayPercent}%` }}
      aria-hidden="true"
    />
  );
}

function OverviewLessonProgressValue({ value }) {
  const text = displayText(value, "");
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!fraction) {
    return <ContextStripValue value={value} format="fraction" />;
  }
  const [, numerator, denominator] = fraction;
  return (
    <strong className="context-strip__value context-strip__value--fraction overview-status-card__lesson-count" aria-label={text}>
      <AnimatedNumber value={numerator} className="context-strip__value-numerator" />
      <span className="context-strip__value-separator">/</span>
      <span className="context-strip__value-denominator">{denominator}</span>
    </strong>
  );
}

function contextStripLabel(label, variant) {
  const text = displayText(label, "");
  if (variant !== "lessons" || !text || /[:：]$/.test(text)) {
    return text;
  }
  return `${text}:`;
}

function ContextSnapshotStrip({ data, t, locale, variant = "overview" }) {
  const context = selectedContextData(data);
  const targetRepository = context.target_repository || {};
  const generated = context.updated_at ? formatDashboardDateTime(context.updated_at) || formatDateTime(context.updated_at, locale) : formatGenerated(data, locale);
  const metric = data.summary?.category_metrics?.lessons || {};
  const progress = contextProgress(context, metric);
  const selectedMenu = contextLabel(context.menu_id, t);
  const currentStep = currentStepTextDisplay(context, t);
  const currentStepShort = currentStepShortDisplay(context, t);
  const currentStepDetail = currentStepDetailDisplay(context, t);
  const nextSafeAction = context.next_safe_action || data.summary?.primary_action || {};
  const nextAction = nextActionShort(context, data, t);
  const rowsByVariant = {
    overview: [
      { label: t("mock.context.now"), value: currentStep, Icon: Target, tone: "blue" },
      { label: t("mock.context.target"), value: repositoryDisplayName(targetRepository.name, t), Icon: Folder, tone: "gray" },
      { label: t("mock.context.nextOperation"), value: nextAction || displayText(nextSafeAction.title, displayText(nextSafeAction.description)), Icon: ArrowRightCircle, tone: "blue" },
      { label: t("app.lastUpdated"), value: generated, Icon: Clock, tone: "purple" },
    ],
    lessons: [
      { label: t("mock.context.selected"), value: selectedMenu, Icon: BookOpen, tone: "blue" },
      { label: t("mock.context.progress"), value: `${progress.completed} / ${progress.total}`, Icon: CircleDashed, tone: "blue", progress: progress.percent, valueFormat: "fraction" },
      { label: t("mock.context.current"), value: currentStepShort, detail: currentStepDetail, Icon: Flag, tone: "blue", valueFormat: "step-fraction" },
      { label: t("mock.context.next"), value: nextAction || displayText(nextSafeAction.title, displayText(nextSafeAction.description)), Icon: ArrowRightCircle, tone: "blue" },
    ],
    workflow: [
      { label: "", value: selectedMenu, Icon: BookOpen, tone: "blue" },
      { label: t("mock.context.externalRepository"), value: repositoryDisplayName(targetRepository.name, t), Icon: Database, tone: "teal" },
      { label: t("repositoryInfo.field.workflow"), value: currentStepShort, Icon: Flag, tone: "teal" },
      { label: t("mock.context.nextStep"), value: nextAction || displayText(nextSafeAction.title, displayText(nextSafeAction.description)), Icon: ArrowRightCircle, tone: "teal" },
    ],
    maintenance: [
      { label: t("mock.context.maintenance.selectedMenu"), value: selectedMenu, Icon: BookOpen, tone: "purple", chip: true },
      { label: t("mock.context.maintenance.targetRepository"), value: repositoryDisplayName(targetRepository.name, t), Icon: Folder, tone: "purple" },
      { label: t("mock.context.maintenance.activeStep"), value: currentStepShort, Icon: Flag, tone: "purple" },
      { label: t("mock.context.maintenance.dataSource"), value: t("mock.context.dashboardSnapshot"), Icon: Database, tone: "purple" },
    ],
    safety: [
      { label: t("mock.context.selectedMenu"), value: selectedMenu, Icon: List, tone: "green" },
      { label: t("mock.context.targetRepository"), value: repositoryDisplayName(targetRepository.name, t), Icon: Folder, tone: "green" },
      { label: t("mock.context.currentStep"), value: currentStepShort, Icon: CheckCircle2, tone: "green" },
      { label: t("mock.context.securityScope"), value: securityScopeLabel(context, t), Icon: ShieldCheck, tone: "green" },
    ],
  };
  const rows = rowsByVariant[variant] || rowsByVariant.overview;
  return (
    <section className={`context-strip context-strip--${variant}`} aria-label={t("context.title")}>
      {rows.map(({ label, value, valueFormat, detail, Icon, tone, progress, chip, invert }, index) => (
        <article className={`context-strip__item context-strip__item--${tone || "default"}${invert ? " context-strip__item--invert" : ""}${chip ? " context-strip__item--chip" : ""}`} key={`${label}-${value}-${index}`}>
          <span className="context-strip__icon">
            {Number.isFinite(progress) ? (
              <AnimatedProgressRing percent={progress} className="mini-progress-ring--icon" />
            ) : (
              <Icon aria-hidden="true" size={24} />
            )}
          </span>
          <div>
            {label ? <span>{contextStripLabel(label, variant)}</span> : null}
            <ContextStripValue
              value={value}
              format={valueFormat}
              animateNumerator={variant === "lessons" && (Number.isFinite(progress) || valueFormat === "step-fraction")}
            />
            {detail && detail !== value ? <small>{detail}</small> : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function liveStatusForContext(liveStatus, context) {
  if (!liveStatus || !context) {
    return null;
  }
  const workflowContext = displayText(context.workflow_context, "");
  if (!["free-development", "product-improvement", "external-integration"].includes(workflowContext)) {
    return null;
  }
  const contextMenuId = displayText(context.menu_id, "");
  const liveMenuId = displayText(liveStatus.menu_id, "");
  if (!contextMenuId || liveMenuId !== contextMenuId) {
    return null;
  }
  const contextRepository = selectedContextRepositoryName(context);
  const liveRepository = displayText(liveStatus.target_repository?.name, "");
  if (contextRepository && liveRepository && contextRepository !== liveRepository) {
    return null;
  }
  return liveStatus;
}

function liveCheck(liveStatus, key) {
  const check = liveStatus?.checks?.[key];
  return check && typeof check === "object" ? check : null;
}

function liveStatusObservedTime(value) {
  const observedAt = displayText(value, "");
  if (!observedAt || observedAt === "not_collected" || observedAt === "unknown") {
    return "";
  }
  return formatDashboardTime(observedAt);
}

function overviewLiveTargetDetail(liveStatus, context, t) {
  const target = repositoryDisplayName(liveStatus?.target_repository?.name || context?.target_repository?.name, t);
  return `${t("overview.fact.target")}: ${target}`;
}

function overviewLiveCheckedDetail(liveStatus, context, check, t) {
  const checkedAt = liveStatusObservedTime(check?.observed_at) || t("overview.fact.noEvidence");
  return `${overviewLiveTargetDetail(liveStatus, context, t)} / ${t("overview.fact.lastChecked")}: ${checkedAt}`;
}

function overviewLiveLocalizedText(value, t) {
  const text = displayText(value, "");
  if (!text) {
    return "";
  }
  const localChanges = text.match(/^(\d+|Uncommitted) local file change\(s\) are not committed\.$/);
  if (localChanges) {
    return localChanges[1] === "Uncommitted" ? t("overview.liveText.gitLocalChangesUnknown") : `${t("overview.liveText.gitLocalChanges")} ${localChanges[1]}`;
  }
  const map = {
    "No remote branch is configured for synchronization.": "overview.liveText.gitNoRemoteBranch",
    "Open workflow details to inspect commit, push, upstream, and local/remote sync state.": "overview.liveText.gitOpenWorkflowAction",
    "No local file changes are waiting for commit.": "overview.liveText.gitNoLocalChanges",
    "Remote branch setup is not required for this mode.": "overview.liveText.gitRemoteNotRequired",
    "Local/remote sync is not required for this mode.": "overview.liveText.gitLocalRemoteNotRequired",
    "Git sync passed": "overview.liveText.gitSyncPassed",
    "Inspect details when a workflow decision needs supporting evidence.": "overview.liveText.inspectDetailsWhenNeeded",
    "CI blocked": "overview.liveText.ciBlocked",
    "No current CI run could be associated with the selected repository.": "overview.liveText.ciRunNotAssociated",
    "Worktree evidence is older than the configured freshness window or product HEAD.": "overview.liveText.gitWorktreeStale",
    "Git synchronization evidence is older than the configured freshness window or product HEAD.": "overview.liveText.gitSyncStale",
    "Structure evidence is older than the configured freshness window or product HEAD.": "overview.liveText.structureStale",
    "Local test evidence is older than the configured freshness window or product HEAD.": "overview.liveText.localTestsStale",
  };
  return map[text] ? t(map[text], text) : text;
}

function overviewLiveCheckPoint(item, t) {
  const sourceId = displayText(item?.source_id || item?.current_item_id, "");
  const summary = overviewLiveLocalizedText(item?.summary, t) || (sourceId ? sourcePresentationKey(sourceId, t) : "");
  const status = statusLabelForChip(item?.status, t);
  const observedAt = liveStatusObservedTime(item?.observed_at);
  const detailArtifactPath = displayText(item?.detail_artifact_path, "");
  const nextCommand = displayText(item?.next_command || item?.required_command, "");
  return [
    summary,
    status,
    sourceId ? `${sourcePresentationKey(sourceId, t)}: ${sourceId}` : "",
    detailArtifactPath,
    nextCommand && nextCommand !== "not_applicable" ? nextCommand : "",
    observedAt ? `${t("overview.fact.lastChecked")}: ${observedAt}` : "",
  ].filter(Boolean).join(" / ");
}

function overviewLiveCheckModalDetail(id, title, liveStatus, context, check, t) {
  const observedAt = liveStatusObservedTime(check?.observed_at) || t("overview.fact.noEvidence");
  const detailPage = displayText(check?.detail_page, id === "security" ? "#safety" : "#workflow");
  const sourceId = displayText(check?.source_id, "");
  const currentItemId = displayText(check?.current_item_id, "");
  const detailArtifactPath = displayText(check?.detail_artifact_path, "");
  const requiredCommand = displayText(check?.required_command, "");
  const points = asArray(check?.items)
    .map((item) => overviewLiveCheckPoint(item, t))
    .filter(Boolean)
    .slice(0, 6);
  const sourceParts = [
    sourceId ? `${sourcePresentationKey(sourceId, t)}: ${sourceId}` : "",
    currentItemId && currentItemId !== sourceId ? currentItemId : "",
    detailArtifactPath,
    requiredCommand && requiredCommand !== "not_applicable" ? requiredCommand : "",
    `${t("overview.fact.lastChecked")}: ${observedAt}`,
  ].filter(Boolean);
  return {
    title,
    summary: overviewLiveLocalizedText(check?.summary, t) || points[0] || overviewLiveLocalizedText(check?.reason, t),
    href: detailPage,
    where: `${overviewLiveTargetDetail(liveStatus, context, t)} / ${detailPage}`,
    why: overviewLiveLocalizedText(check?.reason, t),
    action: overviewLiveLocalizedText(check?.next_action, t),
    source: sourceParts.join(" / "),
    sourceId,
    currentItemId,
    detailArtifactPath,
    status: normalizeState(check?.status || "unknown"),
    points,
  };
}

function overviewLocalCheckCategoryForSource(sourceId) {
  const id = displayText(sourceId, "");
  if (!id) return "";
  if (id === "product.gates.structure" || id.endsWith(".structure") || id.includes(".structure.") || id.includes(".scaffold.") || id.endsWith(".files") || id.includes(".files.") || id.includes(".file.") || id.endsWith(".settings") || id.includes(".settings.") || id.endsWith(".scripts") || id.includes(".scripts.")) {
    return "structure";
  }
  if (id === "product.gates.tests" || id === "product.tests" || id.startsWith("product.tests.") || id.endsWith(".tests") || id.includes(".test.") || id.endsWith(".unit") || id.includes(".unit.") || id.includes("unit_test") || id.endsWith(".smoke") || id.includes(".smoke.") || id.includes("smoke_test") || id.endsWith(".e2e") || id.includes(".e2e.")) {
    return "behavior";
  }
  return "";
}

function overviewLocalCheckKindForSource(sourceId, category = "") {
  const id = displayText(sourceId, "");
  if (id === "product.gates.tests" || id === "product.tests" || id.startsWith("product.tests.") || id.endsWith(".tests")) return "behavior_overall";
  if (id === "product.gates.structure" || id.endsWith(".structure")) return "structure_overall";
  if (id.endsWith(".unit") || id.includes(".unit.") || id.includes("unit_test")) return "unit_test";
  if (id.endsWith(".smoke") || id.includes(".smoke.") || id.includes("smoke_test")) return "smoke_test";
  if (id.endsWith(".e2e") || id.includes(".e2e.")) return "e2e_test";
  if (id.endsWith(".files") || id.includes(".files.") || id.includes(".file.")) return "file_check";
  if (id.endsWith(".settings") || id.includes(".settings.")) return "settings_check";
  if (id.endsWith(".scripts") || id.includes(".scripts.")) return "script_check";
  return category === "structure" ? "structure_check" : "behavior_check";
}

function overviewLocalCheckItemCategory(item) {
  const explicit = displayText(item?.category, "");
  return explicit || overviewLocalCheckCategoryForSource(overviewLocalTestSourceId(item));
}

function overviewLocalCheckItemKind(item) {
  const explicit = displayText(item?.kind, "");
  return explicit || overviewLocalCheckKindForSource(overviewLocalTestSourceId(item), overviewLocalCheckItemCategory(item));
}

function overviewLocalCheckCategoryLabel(category, t) {
  const labels = {
    behavior: "overview.localCheck.category.behavior",
    structure: "overview.localCheck.category.structure",
  };
  return t(labels[category] || "overview.localCheck.category.other");
}

function overviewLocalCheckStatusText(value, t) {
  const state = normalizeState(value);
  if (["ready", "passed"].includes(state)) return t("overview.localCheck.status.success");
  if (state === "cached") return t("overview.localCheck.status.cached");
  if (state === "failed") return t("overview.localCheck.status.failed");
  if (["blocked", "approval_required", "manual_required"].includes(state)) return t("overview.localCheck.status.needsReview");
  if (state === "stale") return t("overview.localCheck.status.stale");
  if (["optional", "not_applicable"].includes(state)) return t("overview.localCheck.status.notApplicable");
  return t("overview.localCheck.status.unknown");
}

function overviewLocalCheckGroupStatus(items) {
  const states = items.map((item) => normalizeState(item?.status || "unknown"));
  if (!states.length) return "not_run";
  if (states.some((item) => item === "failed")) return "failed";
  if (states.some((item) => ["blocked", "approval_required", "manual_required"].includes(item))) return "blocked";
  if (states.some((item) => item === "missing")) return "missing";
  if (states.some((item) => item === "not_run")) return "not_run";
  if (states.some((item) => item === "stale")) return "stale";
  if (states.some((item) => item === "unknown")) return "unknown";
  if (states.every((item) => ["ready", "passed", "cached"].includes(item))) return "passed";
  if (states.every((item) => ["optional", "not_applicable"].includes(item))) return "not_applicable";
  return "unknown";
}

function overviewLocalCheckObservedTime(item) {
  const raw = displayText(item?.observed_at || item?.updated_at || item?.time || item?.last_checked, "");
  if (!raw || raw === "not_collected" || raw === "unknown") {
    return 0;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function overviewLocalCheckGroupSummary(category, items, t) {
  const status = overviewLocalCheckGroupStatus(items);
  const passedCount = items.filter((item) => ["ready", "passed", "cached"].includes(normalizeState(item?.status || "unknown"))).length;
  const observedAt = Math.max(0, ...items.map((item) => overviewLocalCheckObservedTime(item)));
  return {
    category,
    label: overviewLocalCheckCategoryLabel(category, t),
    count: `${passedCount}/${items.length}`,
    status,
    statusLabel: overviewLocalCheckStatusText(status, t),
    observedAt,
  };
}

function overviewLocalCheckSummary(items, t) {
  const localItems = asArray(items).filter((item) => overviewLocalCheckItemCategory(item));
  if (!localItems.length) {
    return "";
  }
  const groups = new Map();
  for (const item of localItems) {
    const category = overviewLocalCheckItemCategory(item);
    groups.set(category, [...(groups.get(category) || []), item]);
  }
  const summaries = ["behavior", "structure"]
    .filter((category) => groups.has(category))
    .map((category) => overviewLocalCheckGroupSummary(category, groups.get(category), t));
  const latest = summaries
    .map((summary, index) => ({ summary, index }))
    .sort((left, right) => (right.summary.observedAt - left.summary.observedAt) || (left.index - right.index))[0]?.summary;
  return latest ? [latest] : "";
}

function overviewLiveLocalTestCurrent(check, t) {
  const itemSummary = overviewLocalCheckSummary(check?.items, t);
  if (itemSummary) {
    return itemSummary;
  }
  const state = normalizeState(check?.status || "not_run");
  if (["ready", "passed", "cached"].includes(state)) {
    return t("overview.current.localTestsChecked");
  }
  if (["failed", "blocked"].includes(state)) {
    return t("overview.current.localTestsNeedsReview");
  }
  return t("overview.current.localTestsMissing");
}

function overviewLiveLocalTestDetail(liveStatus, context, check, t) {
  const observedAt = liveStatusObservedTime(check?.observed_at);
  if (observedAt) {
    return `${overviewLiveTargetDetail(liveStatus, context, t)} / ${t("overview.fact.lastChecked")}: ${observedAt}`;
  }
  return `${overviewLiveTargetDetail(liveStatus, context, t)} / ${t("overview.fact.missing")}: ${t("overview.fact.localTestEvidence")}`;
}

function overviewLiveGitCurrent(liveStatus, check, t) {
  const detailCode = displayText(check?.detail_code, "");
  const sourceId = displayText(check?.source_id || check?.current_item_id, "");
  const status = normalizeState(check?.status || "unknown");
  const dirtyCount = Number(check?.dirty_count || liveStatus?.repository_state?.dirty_count || 0);
  const untrackedCount = Number(check?.untracked_count || liveStatus?.repository_state?.untracked_count || 0);
  const ahead = Number(check?.ahead || liveStatus?.repository_state?.ahead || 0);
  const behind = Number(check?.behind || liveStatus?.repository_state?.behind || 0);
  const localChangeCount = dirtyCount + untrackedCount;
  if (sourceId === "product.git.worktree" || detailCode === "git_uncommitted_changes" || detailCode.includes("worktree")) {
    if (localChangeCount > 0 || ["failed", "blocked"].includes(status)) {
      return localChangeCount > 0 ? `${t("overview.current.gitUncommitted")} ${localChangeCount}` : t("overview.current.gitUncommitted");
    }
    if (["passed", "ready"].includes(status)) {
      return t("overview.current.gitClean");
    }
  }
  if (sourceId === "product.git.local_remote_sync" || detailCode === "git_push_pending" || detailCode === "git_remote_changes_pending" || detailCode.includes("local_remote")) {
    if (behind > 0) {
      return `${t("overview.current.gitRemotePending")} ${behind}`;
    }
    if (ahead > 0 || status === "manual_required") {
      return ahead > 0 ? `${t("overview.current.gitPushPending")} ${ahead}` : t("overview.current.gitPushPending");
    }
    if (["passed", "ready"].includes(status)) {
      return t("overview.current.gitSynced");
    }
  }
  if (sourceId === "product.git.upstream" || detailCode === "git_upstream_missing" || detailCode.includes("upstream")) {
    return status === "not_applicable" ? t("overview.current.gitSyncMissing") : t("overview.current.gitUpstreamMissing");
  }
  if (detailCode === "git_push_pending") {
    return ahead > 0 ? `${t("overview.current.gitPushPending")} ${ahead}` : t("overview.current.gitPushPending");
  }
  if (detailCode === "git_remote_changes_pending") {
    return behind > 0 ? `${t("overview.current.gitRemotePending")} ${behind}` : t("overview.current.gitRemotePending");
  }
  if (detailCode === "git_upstream_missing") {
    return t("overview.current.gitUpstreamMissing");
  }
  if (detailCode === "git_worktree_clean") {
    return t("overview.current.gitClean");
  }
  if (detailCode === "git_local_remote_synced") {
    return t("overview.current.gitSynced");
  }
  const sourceLabel = sourceId ? sourcePresentationKey(sourceId, t) : "";
  if (sourceLabel && sourceLabel !== displayKey(sourceId)) {
    return sourceLabel;
  }
  return status === "passed" ? t("overview.current.gitSynced") : t("overview.current.gitNeedsReview");
}

function overviewLiveGitDetail(liveStatus, context, check, t) {
  const branch = displayText(check?.branch || liveStatus?.repository_state?.branch, "");
  const parts = [overviewLiveTargetDetail(liveStatus, context, t)];
  if (branch) {
    parts.push(`${t("overview.fact.branch")}: ${branch}`);
  }
  parts.push(`${t("overview.fact.lastChecked")}: ${liveStatusObservedTime(check?.observed_at || liveStatus?.generated_at) || t("overview.fact.noEvidence")}`);
  return parts.join(" / ");
}

function overviewLiveCiCurrent(check, t) {
  const detailCode = displayText(check?.detail_code, "");
  if (detailCode === "ci_success") {
    return t("overview.current.ciSuccess");
  }
  if (detailCode === "ci_failed") {
    return t("overview.current.ciFailed");
  }
  if (detailCode === "ci_running" || detailCode === "ci_action_required") {
    return t("overview.current.ciRunning");
  }
  if (detailCode === "ci_run_not_found") {
    return t("overview.current.ciNotRun");
  }
  if (detailCode === "ci_not_required") {
    return t("overview.current.ciNotRequired");
  }
  if (["blocked", "manual_required"].includes(normalizeState(check?.status))) {
    return t("overview.current.ciBlocked");
  }
  return normalizeState(check?.status) === "passed" ? t("overview.current.ciSuccess") : t("overview.current.ciResultMissing");
}

function overviewLiveCiDetail(liveStatus, context, check, t) {
  const workflowName = displayText(check?.workflow_name, "");
  const parts = [overviewLiveTargetDetail(liveStatus, context, t)];
  if (workflowName) {
    parts.push(`${t("overview.fact.workflow")}: ${workflowName}`);
  }
  parts.push(`${t("overview.fact.lastChecked")}: ${liveStatusObservedTime(check?.observed_at) || liveStatusObservedTime(liveStatus?.generated_at) || t("overview.fact.noEvidence")}`);
  return parts.join(" / ");
}

function overviewLiveSecurityCurrent(check, t) {
  const blockerCount = Number(check?.blocker_count || 0);
  const status = normalizeState(check?.status || "unknown");
  if (blockerCount > 0) {
    return `${t("overview.current.securityBlocked")} ${blockerCount}`;
  }
  if (["ready", "passed", "cached"].includes(status)) {
    return t("overview.current.securityReady");
  }
  if (status === "not_run") {
    return t("overview.current.securityMissing");
  }
  const sourceId = displayText(check?.source_id || check?.current_item_id, "");
  const sourceLabel = sourceId ? sourcePresentationKey(sourceId, t) : "";
  if (sourceId.startsWith("product.security.") && sourceLabel && sourceLabel !== displayKey(sourceId)) {
    return sourceLabel;
  }
  return t("overview.current.securityReview");
}

function overviewLiveSecurityDetail(liveStatus, context, check, t) {
  const checkedAt = liveStatusObservedTime(check?.observed_at) || liveStatusObservedTime(liveStatus?.generated_at) || t("overview.fact.noEvidence");
  return `${overviewLiveTargetDetail(liveStatus, context, t)} / ${t("summary.blockers")}: ${Number(check?.blocker_count || 0)} / ${t("overview.fact.lastChecked")}: ${checkedAt}`;
}

function overviewPrimaryStatusCard(data, context, lessonMetric, t, liveStatus = null) {
  const workflowContext = displayText(context.workflow_context, "unknown");
  if (workflowContext === "lesson") {
    const selectedLessonProgress = contextProgress(context, lessonMetric);
    return {
      id: "lessons",
      title: t("overview.status.lessonProgress"),
      status: lessonMetric.status,
      metric: { percent: selectedLessonProgress.percent, status: lessonMetric.status },
      value: `${selectedLessonProgress.completed} / ${selectedLessonProgress.total}`,
      detail: `${selectedLessonProgress.percent}%`,
      chipLabel: selectedStepShort(context),
    };
  }
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const liveLocalTests = liveCheck(activeLiveStatus, "local_tests");
  if (liveLocalTests) {
    const status = normalizeState(liveLocalTests.status || "not_run");
    return {
      id: "workflow",
      title: t("overview.status.localTests"),
      status,
      value: overviewLiveLocalTestCurrent(liveLocalTests, t),
      detail: overviewLiveLocalTestDetail(activeLiveStatus, context, liveLocalTests, t),
      detailInfo: overviewLiveCheckModalDetail("local_tests", t("overview.status.localTests"), activeLiveStatus, context, liveLocalTests, t),
      detailHref: displayText(liveLocalTests.detail_page, "#workflow"),
      chipLabel: statusLabelForChip(status, t),
    };
  }
  const productAuthority = data.development?.product_authority || {};
  const localTestStatus = overviewLocalTestStatus(productAuthority, context);
  return {
    id: "workflow",
    title: t("overview.status.localTests"),
    status: localTestStatus,
    value: overviewLocalTestCurrent(productAuthority, context, t),
    detail: overviewLocalTestDetail(productAuthority, context, t),
    detailHref: "#workflow",
    chipLabel: statusLabelForChip(localTestStatus, t),
  };
}

const overviewGitOperationOrder = ["commit", "push", "pull_request", "pr_ci", "main_ci", "sync_check", "merge"];

function overviewOperationById(data, id) {
  return asArray(data.development?.git_operations).find((operation) => displayText(operation.id, "") === id) || null;
}

function overviewOperationFact(data, id, t) {
  const operation = overviewOperationById(data, id);
  const status = operation?.status || "unknown";
  return {
    id,
    label: gitOperationDisplayLabel(id, operation?.label, t),
    value: statusLabelForChip(status, t),
    status,
    detail: displayText(operation?.detail, t("overview.fact.notProduced")),
  };
}

function overviewGitFacts(data, t) {
  return overviewGitOperationOrder.map((id) => overviewOperationFact(data, id, t));
}

function overviewFirstReviewFact(facts, preferredIds = []) {
  const preferred = preferredIds
    .map((id) => facts.find((fact) => fact.id === id))
    .filter(Boolean)
    .find((fact) => isReviewState(fact.status));
  return preferred || facts.find((fact) => isReviewState(fact.status)) || facts[0] || null;
}

function overviewGitCard(data, context, t, liveStatus = null) {
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const liveGit = liveCheck(activeLiveStatus, "git_sync");
  if (liveGit) {
    const status = normalizeState(liveGit.status || context.git_status || "unknown");
    return {
      id: "git",
      title: t("overview.status.git"),
      status,
      value: overviewLiveGitCurrent(activeLiveStatus, liveGit, t),
      detail: overviewLiveGitDetail(activeLiveStatus, context, liveGit, t),
      detailInfo: overviewLiveCheckModalDetail("git_sync", t("overview.status.git"), activeLiveStatus, context, liveGit, t),
      detailHref: displayText(liveGit.detail_page, "#workflow"),
      chipLabel: statusLabelForChip(status, t),
    };
  }
  const facts = overviewGitFacts(data, t);
  const summary = overviewFirstReviewFact(facts, ["sync_check", "push", "pull_request", "merge", "pr_ci", "main_ci", "commit"]);
  return {
    id: "git",
    title: t("overview.status.git"),
    status: context.git_status || summary?.status,
    value: overviewGitCurrent(data, t),
    detail: overviewRunDetail(overviewRecentRun(data, ["git_sync"], ["git-sync"]), context, t),
    detailHref: "#workflow",
    chipLabel: statusLabelForChip(context.git_status, t),
  };
}

function overviewRecentRun(data, sourceRoles = [], ids = []) {
  return asArray(data.development?.recent_runs).find((row) => {
    const sourceRole = displayText(row.source_role, "");
    const id = displayText(row.id, "");
    return sourceRoles.includes(sourceRole) || ids.includes(id);
  }) || null;
}

function overviewReferenceLabel(row, t) {
  const sourceRole = displayText(row?.source_role, "");
  const reference = displayText(row?.reference, "");
  const sourceRoleKeys = {
    git_sync: "overview.reference.gitSyncEvidence",
    ci: "overview.reference.ciEvidence",
    product_authority: "overview.reference.productAuthority",
    security_gate: "overview.reference.securityGate",
  };
  if (sourceRoleKeys[sourceRole]) {
    return t(sourceRoleKeys[sourceRole], reference || t("overview.fact.noEvidence"));
  }
  const normalized = reference.toLowerCase();
  const referenceKeys = {
    "git sync evidence": "overview.reference.gitSyncEvidence",
    "ci evidence": "overview.reference.ciEvidence",
    "product authority": "overview.reference.productAuthority",
    "security gate": "overview.reference.securityGate",
  };
  return referenceKeys[normalized] ? t(referenceKeys[normalized], reference) : reference || t("overview.fact.noEvidence");
}

function overviewRunReference(row, context, t) {
  const reference = overviewReferenceLabel(row, t);
  const target = workflowRunTarget(row || {}, context, t);
  return target ? `${reference} / ${target}` : reference;
}

function overviewCiCard(data, context, t, liveStatus = null) {
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const liveCi = liveCheck(activeLiveStatus, "ci");
  if (liveCi) {
    const status = normalizeState(liveCi.status || context.ci_status || "unknown");
    return {
      id: "ci",
      title: t("overview.status.ci"),
      status,
      value: overviewLiveCiCurrent(liveCi, t),
      detail: overviewLiveCiDetail(activeLiveStatus, context, liveCi, t),
      detailInfo: overviewLiveCheckModalDetail("ci", t("overview.status.ci"), activeLiveStatus, context, liveCi, t),
      detailHref: displayText(liveCi.detail_page, "#workflow"),
      chipLabel: statusLabelForChip(status, t),
    };
  }
  const prCi = overviewOperationFact(data, "pr_ci", t);
  const mainCi = overviewOperationFact(data, "main_ci", t);
  const run = overviewRecentRun(data, ["ci"], ["ci-main", "pr-ci"]);
  const facts = [prCi, mainCi];
  if (run) {
    facts.push({
      id: "ci_evidence",
      label: t("overview.fact.ciEvidence"),
      value: overviewRunReference(run, context, t),
      status: run.status || context.ci_status,
      detail: formatDashboardTime(run.time || run.observed_at),
    });
  } else {
    facts.push({
      id: "ci_evidence",
      label: t("overview.fact.ciEvidence"),
      value: t("overview.fact.notProduced"),
      status: "unknown",
    });
  }
  const summary = overviewFirstReviewFact(facts, ["pr_ci", "main_ci", "ci_evidence"]);
  return {
    id: "ci",
    title: t("overview.status.ci"),
    status: context.ci_status || summary?.status,
    value: overviewCiCurrent(data, t),
    detail: overviewCiDetail(data, run, context, t),
    detailHref: "#workflow",
    chipLabel: statusLabelForChip(context.ci_status, t),
  };
}

function overviewTargetDetail(context, t) {
  return `${t("overview.fact.target")}: ${repositoryDisplayName(context.target_repository?.name, t)}`;
}

function overviewRunDetail(row, context, t) {
  const target = overviewTargetDetail(context, t);
  if (!row) {
    return `${target} / ${t("overview.fact.lastChecked")}: ${t("overview.fact.noEvidence")}`;
  }
  return `${target} / ${t("overview.fact.lastChecked")}: ${formatDashboardTime(row.time || row.observed_at)}`;
}

function overviewGitCurrent(data, t) {
  const run = overviewRecentRun(data, ["git_sync"], ["git-sync"]);
  return run ? t("overview.current.gitSyncChecked") : t("overview.current.gitSyncMissing");
}

function overviewCiCurrent(data, t) {
  const run = overviewRecentRun(data, ["ci"], ["ci-main", "pr-ci"]);
  return run ? t("overview.current.ciResultChecked") : t("overview.current.ciResultMissing");
}

function overviewCiDetail(data, run, context, t) {
  return overviewRunDetail(run, context, t);
}

function overviewLocalTestSourceId(value) {
  return displayText(value?.source_id || value?.source || value?.id || value, "");
}

function overviewIsLocalTestSource(value) {
  const id = overviewLocalTestSourceId(value);
  return Boolean(overviewLocalCheckCategoryForSource(id));
}

function overviewLocalTestEvidenceItems(productAuthority) {
  return asArray(productAuthority?.evidence_summary?.items).filter((item) => overviewIsLocalTestSource(item));
}

function overviewLocalTestEvidenceItem(productAuthority) {
  return overviewLocalTestEvidenceItems(productAuthority)[0] || null;
}

function overviewLocalTestBlockers(productAuthority, context) {
  const rows = [...asArray(context?.blockers), ...asArray(productAuthority?.product_operation_blockers)];
  return rows.filter((row) => overviewIsLocalTestSource(row));
}

function overviewLocalTestBlocker(productAuthority, context) {
  return overviewLocalTestBlockers(productAuthority, context)[0] || null;
}

function overviewLocalTestSummaryItems(productAuthority, context) {
  const evidenceItems = overviewLocalTestEvidenceItems(productAuthority);
  const evidenceSourceIds = new Set(evidenceItems.map((item) => overviewLocalTestSourceId(item)));
  const blockerItems = overviewLocalTestBlockers(productAuthority, context).filter((item) => !evidenceSourceIds.has(overviewLocalTestSourceId(item)));
  return [...evidenceItems, ...blockerItems];
}

function overviewLocalTestStatus(productAuthority, context) {
  const items = overviewLocalTestSummaryItems(productAuthority, context);
  return overviewLocalCheckGroupStatus(items);
}

function overviewLocalTestCurrent(productAuthority, context, t) {
  const itemSummary = overviewLocalCheckSummary(overviewLocalTestSummaryItems(productAuthority, context), t);
  if (itemSummary) {
    return itemSummary;
  }
  const state = overviewLocalTestStatus(productAuthority, context);
  if (["ready", "passed", "cached"].includes(state)) {
    return t("overview.current.localTestsChecked");
  }
  if (["failed", "blocked"].includes(state)) {
    return t("overview.current.localTestsNeedsReview");
  }
  return t("overview.current.localTestsMissing");
}

function overviewEvidenceObservedTime(row) {
  const value = displayText(row?.observed_at || row?.time || row?.last_checked, "");
  if (!value || value === "not_collected" || value === "unknown") {
    return "";
  }
  return formatDashboardTime(value);
}

function overviewLocalTestDetail(productAuthority, context, t) {
  const evidenceItem = overviewLocalTestEvidenceItem(productAuthority);
  const observedAt = overviewEvidenceObservedTime(evidenceItem);
  if (observedAt) {
    return `${overviewTargetDetail(context, t)} / ${t("overview.fact.lastChecked")}: ${observedAt}`;
  }
  return `${overviewTargetDetail(context, t)} / ${t("overview.fact.missing")}: ${t("overview.fact.localTestEvidence")}`;
}

function overviewSecurityCard(data, context, t, liveStatus = null) {
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const liveSecurity = liveCheck(activeLiveStatus, "security");
  if (liveSecurity) {
    const status = normalizeState(liveSecurity.status || context.security_status || "unknown");
    return {
      id: "security",
      title: t("overview.status.security"),
      status,
      value: overviewLiveSecurityCurrent(liveSecurity, t),
      detail: overviewLiveSecurityDetail(activeLiveStatus, context, liveSecurity, t),
      detailInfo: overviewLiveCheckModalDetail("security", t("overview.status.security"), activeLiveStatus, context, liveSecurity, t),
      detailHref: displayText(liveSecurity.detail_page, "#safety"),
      chipLabel: statusLabelForChip(status, t),
    };
  }
  const approvals = asArray(data.security?.approvals);
  const dangerous = asArray(data.security?.dangerous_operations);
  const blockers = asArray(context.blockers);
  const facts = [
    {
      id: "gate",
      label: t("security.item.gate"),
      value: statusLabelForChip(data.security?.gate_status || context.security_status, t),
      status: data.security?.gate_status || context.security_status,
    },
    ...approvals.slice(0, 2).map((row) => ({
      id: displayText(row.id),
      label: securityRowLabel(row, "approval", t),
      value: statusLabelForChip(row.status, t),
      status: row.status,
      detail: securityRowDetail(row, t),
    })),
    ...dangerous.slice(0, 2).map((row) => ({
      id: displayText(row.id),
      label: securityRowLabel(row, "dangerous", t),
      value: statusLabelForChip(row.status, t),
      status: row.status,
      detail: securityRowDetail(row, t),
    })),
    {
      id: "blockers",
      label: t("summary.blockers"),
      value: blockers.length ? `${blockers.length}` : t("summary.none"),
      status: blockers.length ? "blocked" : "ready",
    },
  ];
  const summary = overviewFirstReviewFact(facts, ["merge", "dangerous_action_approval", "git_workflow_approval", "gate", "blockers"]);
  return {
    id: "security",
    title: t("overview.status.security"),
    status: context.security_status || summary?.status,
    value: overviewSecurityCurrent(summary, blockers, t),
    detail: overviewSecurityDetail(data, context, blockers, t),
    chipLabel: statusLabelForChip(context.security_status, t),
  };
}

function overviewSecurityCurrent(summary, blockers, t) {
  if (!summary && !asArray(blockers).length) {
    return t("overview.current.securityReady");
  }
  return t("overview.current.securityScopeChecked");
}

function overviewSecurityLastChecked(data) {
  const approvals = asArray(data.security?.approvals);
  const dangerous = asArray(data.security?.dangerous_operations);
  const run = overviewRecentRun(data, ["security_gate"], ["security-gate"]);
  return overviewEvidenceObservedTime(approvals[0]) || overviewEvidenceObservedTime(dangerous[0]) || overviewEvidenceObservedTime(run);
}

function overviewSecurityDetail(data, context, blockers, t) {
  const checkedAt = overviewSecurityLastChecked(data) || t("overview.fact.noEvidence");
  return `${overviewTargetDetail(context, t)} / ${t("overview.fact.lastChecked")}: ${checkedAt} / ${t("summary.blockers")}: ${asArray(blockers).length}`;
}

function situationLiveStatusForContext(liveStatus, context) {
  if (!liveStatus || !context) {
    return null;
  }
  const contextMenuId = displayText(context.menu_id, "");
  const liveMenuId = displayText(liveStatus.menu_id, "");
  if (contextMenuId && liveMenuId && liveMenuId !== contextMenuId) {
    return null;
  }
  const contextRepository = selectedContextRepositoryName(context);
  const liveRepository = displayText(liveStatus.target_repository?.name, "");
  if (contextRepository && liveRepository && contextRepository !== liveRepository) {
    return null;
  }
  return liveStatus;
}

function situationNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function shortRevision(value) {
  const text = displayText(value, "");
  return text.length > 12 ? text.slice(0, 12) : text;
}

function situationObservedAt(value, fallback = "") {
  return liveStatusObservedTime(value) || liveStatusObservedTime(fallback);
}

function situationFreshnessMeta(data, activeLiveStatus, t) {
  if (activeLiveStatus) {
    return {
      label: t("overview.situation.liveObservation"),
      time: situationObservedAt(activeLiveStatus.generated_at) || t("overview.fact.noEvidence"),
    };
  }
  const snapshotTime = formatGenerated(data, getDashboardIntlLocale(data.summary?.ui_locale || "en"));
  if (snapshotTime) {
    return {
      label: t("overview.situation.savedSnapshotFallback"),
      time: snapshotTime,
    };
  }
  return {
    label: t("overview.situation.lastValidatedSnapshot"),
    time: t("overview.fact.noEvidence"),
  };
}

function situationWorstStatus(statuses, fallback = "ready") {
  const normalized = statuses.map((status) => normalizeState(status)).filter(Boolean);
  if (!normalized.length) {
    return normalizeState(fallback);
  }
  return normalized
    .map((status, index) => ({ status, index }))
    .sort((left, right) => (statePriority[left.status] ?? 99) - (statePriority[right.status] ?? 99) || left.index - right.index)[0].status;
}

function situationRepositoryState(data, context, activeLiveStatus) {
  const liveRepositoryState = activeLiveStatus?.repository_state || {};
  const repositoryChanges = data.repository_changes || {};
  const repositoryScope = data.repository_scope || {};
  const targetRepository = activeLiveStatus?.target_repository || context.target_repository || {};
  return {
    branch: displayText(liveRepositoryState.branch || repositoryChanges.branch || repositoryScope.branch, ""),
    head: displayText(liveRepositoryState.head || repositoryChanges.head || repositoryScope.head || repositoryScope.git_head, ""),
    upstream: displayText(liveRepositoryState.upstream || repositoryChanges.upstream, ""),
    dirtyCount: situationNumber(liveRepositoryState.dirty_count ?? repositoryChanges.dirty_count ?? repositoryChanges.unstaged_count),
    untrackedCount: situationNumber(liveRepositoryState.untracked_count ?? repositoryChanges.untracked_count),
    ahead: situationNumber(liveRepositoryState.ahead ?? repositoryChanges.ahead),
    behind: situationNumber(liveRepositoryState.behind ?? repositoryChanges.behind),
    pathState: displayText(targetRepository.path_state || repositoryScope.path_state || context.target_repository?.path_state, ""),
    gitState: displayText(targetRepository.git_state || repositoryScope.git_state, ""),
  };
}

function situationFirstCommand(...values) {
  return values.map((value) => displayText(value, "")).find((value) => value && value !== "not_applicable") || "";
}

function situationCheck(activeLiveStatus, key) {
  const check = liveCheck(activeLiveStatus, key);
  return check && typeof check === "object" ? check : null;
}

function situationBlockingRows(data, context, activeLiveStatus) {
  const rows = [
    ...asArray(context?.blockers),
    ...asArray(data.summary?.blocking_items),
  ];
  for (const [key, check] of objectEntries(activeLiveStatus?.checks || {})) {
    const count = situationNumber(check?.blocker_count);
    if (count > 0) {
      rows.push({
        source: displayText(check?.source_id || check?.current_item_id || key, key),
        status: check?.status || "blocked",
        reason: check?.reason || check?.summary,
        required_command: check?.required_command,
        blocker_count: count,
      });
    }
  }
  const seen = new Set();
  return rows.filter((row) => {
    const key = [
      displayText(row?.source || row?.source_id || row?.id, ""),
      displayText(row?.reason || row?.summary || row?.detail, ""),
      displayText(row?.required_command || row?.next_command, ""),
    ].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function situationStatusDetail(label, status, t) {
  return `${label}: ${statusLabelForChip(status, t)}`;
}

function situationRepositorySummary(data, context, activeLiveStatus, t) {
  const repo = situationRepositoryState(data, context, activeLiveStatus);
  const localChanges = repo.dirtyCount + repo.untrackedCount;
  const liveGit = situationCheck(activeLiveStatus, "git_sync");
  const status = normalizeState(liveGit?.status || context.git_status || "unknown");
  const cleanText = localChanges > 0 ? `${t("overview.situation.gitDirty")} ${localChanges}` : t("overview.current.gitClean");
  const syncParts = [
    repo.ahead ? `${t("overview.situation.ahead")}: ${repo.ahead}` : "",
    repo.behind ? `${t("overview.situation.behind")}: ${repo.behind}` : "",
    repo.untrackedCount ? `${t("overview.situation.untracked")}: ${repo.untrackedCount}` : "",
  ].filter(Boolean);
  const branchParts = [
    repo.branch ? `${t("overview.fact.branch")}: ${repo.branch}` : "",
    repo.upstream ? `${t("overview.situation.upstream")}: ${repo.upstream}` : "",
    repo.head ? `${t("overview.situation.head")}: ${shortRevision(repo.head)}` : "",
  ].filter(Boolean);
  return {
    id: "git",
    Icon: GitBranch,
    title: t("overview.situation.gitTitle"),
    status,
    value: cleanText,
    detail: [...branchParts, ...syncParts].join(" / ") || t("overview.fact.noEvidence"),
    source: displayText(liveGit?.source_id || liveGit?.current_item_id || repo.gitState || repo.pathState, ""),
    command: situationFirstCommand(liveGit?.required_command, liveGit?.items?.[0]?.next_command),
  };
}

function situationTestsCiSummary(data, context, activeLiveStatus, t) {
  const localTests = situationCheck(activeLiveStatus, "local_tests");
  const ci = situationCheck(activeLiveStatus, "ci");
  const localStatus = normalizeState(localTests?.status || overviewLocalTestStatus(data.development?.product_authority || {}, context));
  const ciStatus = normalizeState(ci?.status || context.ci_status || data.development?.ci_status || "unknown");
  const status = situationWorstStatus([localStatus, ciStatus], "unknown");
  const observed = [
    situationObservedAt(localTests?.observed_at, activeLiveStatus?.generated_at),
    situationObservedAt(ci?.observed_at, activeLiveStatus?.generated_at),
  ].filter(Boolean)[0];
  return {
    id: "tests-ci",
    Icon: CheckCircle2,
    title: t("overview.situation.testsCiTitle"),
    status,
    value: `${situationStatusDetail(t("overview.situation.localTests"), localStatus, t)} / ${situationStatusDetail(t("overview.situation.ci"), ciStatus, t)}`,
    detail: observed ? `${t("overview.fact.lastChecked")}: ${observed}` : t("overview.fact.noEvidence"),
    source: displayText(localTests?.source_id || ci?.source_id || "", ""),
    command: situationFirstCommand(localTests?.required_command, ci?.required_command, localTests?.items?.[0]?.next_command, ci?.items?.[0]?.next_command),
  };
}

function situationBlockerSummary(data, context, activeLiveStatus, t) {
  const blockers = situationBlockingRows(data, context, activeLiveStatus);
  const first = blockers[0] || null;
  const blockerCount = blockers.reduce((total, row) => total + Math.max(1, situationNumber(row?.blocker_count || 1)), 0);
  return {
    id: "blockers",
    Icon: AlertTriangle,
    title: t("overview.situation.blockersTitle"),
    status: blockerCount > 0 ? "blocked" : "ready",
    value: blockerCount > 0 ? `${blockerCount} ${t("overview.situation.blockerUnit")}` : t("overview.situation.noBlockers"),
    detail: first ? overviewLiveLocalizedText(first.reason || first.summary || first.detail, t) : t("overview.situation.noBlockersDetail"),
    source: displayText(first?.source || first?.source_id || first?.id, ""),
    command: situationFirstCommand(first?.required_command, first?.next_command),
  };
}

function situationCurrentWorkSummary(data, context, activeLiveStatus, t) {
  const repository = repositoryDisplayName(activeLiveStatus?.target_repository?.name || context.target_repository?.name, t);
  const menu = contextLabel(context.menu_id, t);
  const workflow = workflowContextLabel(context.workflow_context, t);
  const step = currentStepTextDisplay(context, t);
  return {
    id: "current-work",
    Icon: Compass,
    title: t("overview.situation.currentWorkTitle"),
    status: context.evidence_status || "manual_required",
    value: menu,
    detail: [repository, workflow, step].filter(Boolean).join(" / "),
    source: displayText(context.current_step_id || context.menu_id, ""),
    command: "",
  };
}

function situationNextSafeSummary(data, context, activeLiveStatus, facts, t) {
  const nextAction = context.next_safe_action || data.summary?.primary_action || {};
  const blockerCommand = facts.map((fact) => fact.command).find(Boolean);
  const liveCommands = objectEntries(activeLiveStatus?.checks || {}).map(([, check]) => check?.required_command);
  const command = situationFirstCommand(blockerCommand, ...liveCommands, asArray(data.actions?.command_previews)[0]?.command_text);
  const status = normalizeState(nextAction.status || data.summary?.primary_action?.status || "manual_required");
  return {
    id: "next-safe",
    Icon: ArrowRightCircle,
    title: t("overview.situation.nextSafeTitle"),
    status,
    value: nextActionShort(context, data, t) || t("detail.nextSafeCheck"),
    detail: displayText(nextAction.expected_result || nextAction.description, t("overview.situation.nextSafeDetail")),
    source: displayText(nextAction.source || nextAction.target || "", ""),
    command,
  };
}

function situationFacts(data, context, activeLiveStatus, t) {
  const baseFacts = [
    situationCurrentWorkSummary(data, context, activeLiveStatus, t),
    situationBlockerSummary(data, context, activeLiveStatus, t),
    situationRepositorySummary(data, context, activeLiveStatus, t),
    situationTestsCiSummary(data, context, activeLiveStatus, t),
  ];
  return [...baseFacts, situationNextSafeSummary(data, context, activeLiveStatus, baseFacts, t)];
}

function SituationFactCard({ fact, t, displayPolicy }) {
  const Icon = fact.Icon;
  const source = displayText(fact.source, "");
  const command = displayText(fact.command, "");
  const showSource = source && !displayPolicy.isFriendly;
  return (
    <article className={`operational-situation__fact operational-situation__fact--${fact.id}`} data-operational-situation-fact={fact.id}>
      <div className="operational-situation__fact-head">
        <span className="operational-situation__fact-icon">
          <Icon aria-hidden="true" size={21} />
        </span>
        <div>
          <h3>{fact.title}</h3>
          <StatusPill value={fact.status} t={t} label={statusLabelForChip(fact.status, t)} />
        </div>
      </div>
      <strong>{fact.value}</strong>
      {fact.detail ? <p>{fact.detail}</p> : null}
      {showSource || command ? (
        <div className="operational-situation__evidence">
          {showSource ? (
            <span>
              {t("overview.situation.source")}: {technicalChip(source)}
            </span>
          ) : null}
          {command ? (
            <span>
              {t("overview.situation.command")}: <CommandChip command={command} />
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function OperationalSituationBoard({ data, context, liveStatus, t }) {
  const activeLiveStatus = situationLiveStatusForContext(liveStatus, context);
  const facts = situationFacts(data, context, activeLiveStatus, t);
  const overallStatus = situationWorstStatus(facts.map((fact) => fact.status), "ready");
  const repository = repositoryDisplayName(activeLiveStatus?.target_repository?.name || context.target_repository?.name, t);
  const freshness = situationFreshnessMeta(data, activeLiveStatus, t);
  const displayPolicy = displayDepthPolicyForData(data);
  return (
    <section className="operational-situation" aria-labelledby="operational-situation-heading" data-operational-situation="true" data-dashboard-display-depth={displayPolicy.depth}>
      <div className="operational-situation__header">
        <span className="operational-situation__icon">
          <Activity aria-hidden="true" size={24} />
        </span>
        <div>
          <h2 id="operational-situation-heading">{t("overview.situation.title")}</h2>
          <p>{t("overview.situation.subtitle")}</p>
        </div>
        <StatusPill value={overallStatus} t={t} label={statusLabelForChip(overallStatus, t)} />
      </div>
      <div className="operational-situation__meta" aria-label={t("overview.situation.meta")}>
        <span>{t("overview.fact.target")}: <strong>{repository}</strong></span>
        <span>{t("overview.fact.workflow")}: <strong>{workflowContextLabel(context.workflow_context, t)}</strong></span>
        <span>{freshness.label}: <strong>{freshness.time}</strong></span>
      </div>
      <div className="operational-situation__grid">
        {facts.map((fact) => (
          <SituationFactCard key={fact.id} fact={fact} t={t} displayPolicy={displayPolicy} />
        ))}
      </div>
    </section>
  );
}

function operationalDetailFacts(data, context, activeLiveStatus, t) {
  const factsById = new Map(situationFacts(data, context, activeLiveStatus, t).map((fact) => [fact.id, fact]));
  return ["blockers", "git", "tests-ci", "next-safe"].map((id) => factsById.get(id)).filter(Boolean);
}

function operationalDetailEvidenceRows(activeLiveStatus, keys, t, limit = 6) {
  const rows = liveEvidenceRows(activeLiveStatus, keys, t);
  const selected = [];
  const selectedIds = new Set();
  const addRow = (row) => {
    if (!row || selectedIds.has(row.id) || selected.length >= limit) {
      return;
    }
    selected.push(row);
    selectedIds.add(row.id);
  };
  keys.forEach((key) => addRow(rows.find((row) => row.key === key)));
  rows.forEach(addRow);
  return selected;
}

function OperationalDetailDecisionCard({ fact, t, displayPolicy }) {
  const Icon = fact.Icon;
  const source = displayText(fact.source, "");
  const command = displayText(fact.command, "");
  const showSource = source && displayPolicy.isTechnical;
  return (
    <article className={`operational-detail-card operational-detail-card--${fact.id}`} data-operational-detail-fact={fact.id}>
      <div className="operational-detail-card__head">
        <span className="operational-detail-card__icon">
          <Icon aria-hidden="true" size={20} />
        </span>
        <div>
          <h3>{fact.title}</h3>
          <StatusPill value={fact.status} t={t} label={statusLabelForChip(fact.status, t)} />
        </div>
      </div>
      <strong>{fact.value}</strong>
      {fact.detail ? <p>{fact.detail}</p> : null}
      {showSource || command ? (
        <div className="operational-detail-card__evidence">
          {showSource ? (
            <span>
              {t("overview.situation.source")}: {technicalChip(source)}
            </span>
          ) : null}
          {command ? (
            <span>
              {t("overview.situation.command")}: <CommandChip command={command} />
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function OperationalDetailEvidenceQueue({ activeLiveStatus, keys, t, tone, displayPolicy }) {
  const rows = operationalDetailEvidenceRows(activeLiveStatus, keys, t);
  const showTechnicalSource = displayPolicy.isTechnical;
  return (
    <div className="operational-detail-evidence" data-operational-detail-evidence="true">
      <div className="operational-detail-evidence__head">
        <h3>{t("detail.operational.evidenceTitle")}</h3>
        <p>{t("detail.operational.evidenceDetail")}</p>
      </div>
      <div className="operational-detail-evidence__list">
        {rows.length ? rows.map((row) => {
          const command = displayText(row.command, "");
          const usableCommand = command && command !== "not_applicable" ? command : "";
          return (
            <article
              className={`operational-detail-evidence__row operational-detail-evidence__row--${normalizeState(row.status)}`}
              key={row.id}
              data-operational-detail-evidence-key={row.key}
              data-evidence-source-id={row.sourceId || undefined}
              data-evidence-current-item-id={row.currentItemId || undefined}
            >
              <div>
                <strong>{row.title}</strong>
                <span>{row.target}{row.branch ? ` / ${row.branch}` : ""}</span>
              </div>
              <p>{row.summary}</p>
              <StatusPill value={row.status} t={t} label={statusLabelForChip(row.status, t)} />
              <span>{row.observedAt || t("workflow.table.snapshotEvidence")}</span>
              <div className="operational-detail-evidence__reference">
                {showTechnicalSource && row.sourceId ? technicalChip(row.sourceId) : null}
                {usableCommand ? <CommandChip command={usableCommand} /> : null}
                <InsightDetailButton
                  detail={liveEvidenceRowInsight(row, t)}
                  label={t("summary.viewDetails")}
                  t={t}
                  tone={tone === "safety" ? "safety" : tone === "maintenance" ? "maintenance" : "workflow"}
                />
              </div>
            </article>
          );
        }) : (
          <article className="operational-detail-evidence__row operational-detail-evidence__row--empty">
            <div>
              <strong>{t("summary.none")}</strong>
              <span>{t("workflow.table.snapshotEvidence")}</span>
            </div>
            <p>{t("detail.operational.evidenceEmpty")}</p>
            <StatusPill value="unknown" t={t} label={statusLabelForChip("unknown", t)} />
            <span>{t("workflow.table.snapshotEvidence")}</span>
            <div>{t("summary.none")}</div>
          </article>
        )}
      </div>
    </div>
  );
}

function OperationalDetailDecisionPanel({ data, context, liveStatus, t, tone = "workflow", pageId, keys }) {
  const activeLiveStatus = situationLiveStatusForContext(liveStatus, context);
  const facts = operationalDetailFacts(data, context, activeLiveStatus, t);
  const displayPolicy = displayDepthPolicyForData(data);
  const evidenceRows = liveEvidenceRows(activeLiveStatus, keys, t);
  const overallStatus = situationWorstStatus([...facts.map((fact) => fact.status), ...evidenceRows.map((row) => row.status)], "ready");
  const repository = repositoryDisplayName(activeLiveStatus?.target_repository?.name || context.target_repository?.name, t);
  const freshness = situationFreshnessMeta(data, activeLiveStatus, t);
  const headingId = `${pageId || tone}-operational-detail-heading`;
  return (
    <section
      className={`operational-detail-panel operational-detail-panel--${tone}`}
      aria-labelledby={headingId}
      data-operational-detail-decisions={pageId || tone}
      data-dashboard-display-depth={displayPolicy.depth}
    >
      <div className="operational-detail-panel__header">
        <span className="operational-detail-panel__icon">
          <Activity aria-hidden="true" size={22} />
        </span>
        <div>
          <h2 id={headingId}>{t("detail.operational.title")}</h2>
          <p>{t("detail.operational.subtitle")}</p>
        </div>
        <StatusPill value={overallStatus} t={t} label={statusLabelForChip(overallStatus, t)} />
      </div>
      <div className="operational-detail-panel__meta" aria-label={t("detail.operational.meta")}>
        <span>{t("overview.fact.target")}: <strong>{repository}</strong></span>
        <span>{t("overview.fact.workflow")}: <strong>{workflowContextLabel(context.workflow_context, t)}</strong></span>
        <span>{freshness.label}: <strong>{freshness.time}</strong></span>
      </div>
      <div className="operational-detail-panel__grid">
        {facts.map((fact) => (
          <OperationalDetailDecisionCard key={fact.id} fact={fact} t={t} displayPolicy={displayPolicy} />
        ))}
      </div>
      <OperationalDetailEvidenceQueue activeLiveStatus={activeLiveStatus} keys={keys} t={t} tone={tone} displayPolicy={displayPolicy} />
    </section>
  );
}

function HorizontalProgress({ percent }) {
  const value = clampPercent(percent);
  return (
    <div className="horizontal-progress" aria-label={`${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function OverviewLocalCheckSummaryValue({ rows }) {
  return (
    <div className="decision-progress-summary" role="list">
      {rows.map((row) => (
        <span className={`decision-progress-summary__row decision-progress-summary__row--${normalizeState(row.status)}`} role="listitem" key={row.category}>
          <span className="decision-progress-summary__label">{row.label}</span>
          {" "}
          <strong className="decision-progress-summary__count">{row.count}</strong>
        </span>
      ))}
    </div>
  );
}

function OverviewStatusValue({ value }) {
  if (Array.isArray(value)) {
    return <OverviewLocalCheckSummaryValue rows={value} />;
  }
  return <strong>{value}</strong>;
}

function OverviewStatusCard({ id, title, status, metric, value, detail, t, chipLabel, detailInfo, detailHref }) {
  const config = overviewStatusConfig[id] || overviewStatusConfig.lessons;
  const Icon = config.Icon;
  const state = normalizeState(metric?.status || status);
  const valueText = value === undefined || value === null || value === "" ? stateLabel(state, t) : value;
  const chipCompactClass = [state === "manual_required" ? "status-chip--compact-label" : "", id !== "lessons" ? "status-chip--compact-density" : ""].filter(Boolean).join(" ");
  const percentValue = id === "lessons" ? displayText(detail, "").match(/^(\d+)%$/) : null;
  const insightDetail = detailInfo ? { ...detailInfo, href: detailInfo.href || detailHref } : null;
  const evidenceSourceId = displayText(insightDetail?.sourceId, "");
  const evidenceCurrentItemId = displayText(insightDetail?.currentItemId, "");
  const evidenceDetailArtifactPath = displayText(insightDetail?.detailArtifactPath, "");
  return (
    <article
      className={`overview-status-card overview-status-card--${config.tone}`}
      data-overview-status-card={id}
      data-evidence-source-id={evidenceSourceId || undefined}
      data-evidence-current-item-id={evidenceCurrentItemId || undefined}
      data-evidence-detail-artifact-path={evidenceDetailArtifactPath || undefined}
    >
      <div className="overview-status-card__head">
        <span className="overview-status-card__icon">
          <Icon aria-hidden="true" size={26} />
        </span>
        <div>
          <h3>{title}</h3>
          {id === "lessons" ? <OverviewLessonProgressValue value={valueText} /> : <OverviewStatusValue value={valueText} />}
        </div>
      </div>
      {metric ? (
        <div className="overview-status-card__progress-row">
          <HorizontalProgress percent={metric.percent} />
          <strong className="overview-status-card__progress-value">
            {percentValue ? (
              <>
                <AnimatedNumber value={percentValue[1]} className="overview-status-card__progress-number" />
                %
              </>
            ) : detail}
          </strong>
        </div>
      ) : null}
      {detail && !metric ? <p>{detail}</p> : null}
      {insightDetail ? (
        <InsightDetailButton
          className="mini-card-button"
          detail={insightDetail}
          label={t("detail.openPlainDetail")}
          t={t}
          tone={id === "security" ? "safety" : "default"}
        />
      ) : null}
      {chipLabel ? <span className={`status-chip status-chip--${config.tone} ${chipCompactClass}`.trim()}>{chipLabel}</span> : <StatusPill value={state} t={t} />}
    </article>
  );
}

function gitOperationIcon(id) {
  const map = {
    commit: GitBranch,
    push: ArrowUp,
    pull_request: GitPullRequest,
    pr_ci: CheckCircle2,
    main_ci: RefreshCw,
    sync_check: RefreshCw,
    merge: GitMerge,
  };
  return map[displayText(id)] || GitBranch;
}

function gitOperationModeLabel(mode, t, id = "") {
  const normalized = displayText(mode, "auto");
  const operationId = displayText(id, "");
  if (operationId === "merge") {
    if (["auto", "after_approval", "developer_auto"].includes(normalized)) {
      return t("settingsPage.value.boolean.true");
    }
    if (normalized === "manual" || normalized === "false") {
      return t("settingsPage.value.boolean.false");
    }
    if (normalized === "not_applicable") {
      return statusLabelForChip("not_applicable", t);
    }
  }
  if (normalized === "manual") {
    return t("mock.git.manual");
  }
  if (normalized === "gated") {
    return t("mock.git.gated");
  }
  return t("mock.git.auto");
}

function gitOperationModeClass(mode, id = "") {
  const normalized = displayText(mode, "auto");
  const operationId = displayText(id, "");
  if (operationId === "merge" && ["auto", "after_approval", "developer_auto"].includes(normalized)) {
    return "allowed";
  }
  if (normalized === "developer_auto") {
    return "auto";
  }
  return normalized;
}

function gitOperationDisplayLabel(id, fallback, t) {
  const key = displayText(id, "unknown");
  return t(`mock.git.operation.${key}`, displayText(fallback, displayKey(key)));
}

function GitOperationRail({ operations, t, variant = "workflow" }) {
  const visibleIds = variant === "overview" ? new Set(["push", "pull_request", "pr_ci", "merge"]) : null;
  const rows = asArray(operations).filter((row) => !visibleIds || visibleIds.has(displayText(row.id)));
  if (!rows.length) {
    return null;
  }
  return (
    <section className={`operation-rail operation-rail--${variant}`} aria-label={t("workflow.gitManagement")}>
      <div className="operation-rail__head">
        <Settings aria-hidden="true" size={20} />
        <h3>{variant === "overview" ? t("workflow.gitManagement") : t("workflow.gitManagementApplied")}</h3>
      </div>
      <div className="operation-rail__items">
        {rows.map((row) => {
          const Icon = gitOperationIcon(row.id);
          const mode = gitOperationModeClass(row.mode, row.id);
          return (
          <article className={`operation-chip operation-chip--${mode}`} key={displayText(row.id)}>
            <span className="operation-chip__icon">
              <Icon aria-hidden="true" size={18} />
            </span>
            <strong>{gitOperationDisplayLabel(row.id, row.label, t)}</strong>
            <span className={`mode-pill mode-pill--${mode}`}>{gitOperationModeLabel(row.mode, t, row.id)}</span>
          </article>
        );
        })}
      </div>
    </section>
  );
}

function SecurityOverviewPanel({ security, partialFailures, t }) {
  const failures = asArray(partialFailures);
  const securityGate = security?.gate_status;
  return (
    <section className="security-overview-panel" aria-label={t("overview.securityConfirmation")}>
      <div className="security-overview-panel__icon">
        <ShieldCheck aria-hidden="true" size={28} />
      </div>
      <div className="security-overview-panel__main">
        <h3>{t("overview.securityConfirmation")}</h3>
        <div className="security-overview-panel__facts">
          <span>{t("security.item.gate")} <StatusPill value={securityGate} t={t} label={statusLabelForChip(securityGate, t)} /></span>
          <span>{t("summary.partialFailures")} <strong>{failures.length ? failures.length : t("summary.none")}</strong></span>
        </div>
      </div>
      <a className="panel-link" href="#safety">
        {t("summary.viewDetails")}
        <ArrowRightCircle aria-hidden="true" size={16} />
      </a>
    </section>
  );
}

function CommonStatusPanel({ data, partialFailures, t }) {
  const operations = asArray(data.development?.git_operations);
  const operationIds = new Set(["push", "pull_request", "pr_ci", "merge"]);
  const visibleOperations = operations.filter((operation) => operationIds.has(displayText(operation.id, "")));
  const failures = asArray(partialFailures);
  const securityGate = data.security?.gate_status;
  return (
    <section className="common-status-panel" aria-labelledby="common-status-heading">
      <h3 id="common-status-heading">{t("overview.commonStatus")}</h3>
      <div className="common-status-grid">
        <article className="common-status-card common-status-card--git">
          <span className="common-status-card__icon">
            <Settings aria-hidden="true" size={30} />
          </span>
          <div className="common-status-card__main">
            <h4>{t("workflow.gitManagement")}</h4>
            <div className="common-status-ops">
              {visibleOperations.map((operation) => {
                const Icon = gitOperationIcon(operation.id);
                const mode = gitOperationModeClass(operation.mode, operation.id);
                return (
                  <div className="common-status-op" key={displayText(operation.id)}>
                  <span className="common-status-op__label">
                    <Icon aria-hidden="true" size={17} />
                      {gitOperationDisplayLabel(operation.id, operation.label, t)}
                  </span>
                    <span className={`common-mode-pill common-mode-pill--${mode}`}>{gitOperationModeLabel(operation.mode, t, operation.id)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="common-status-card__side">
            <p>{t("overview.common.gitDetail")}</p>
            <a className="common-status-link" href="#workflow">
              {t("summary.viewDetails")}
              <ArrowRightCircle aria-hidden="true" size={15} />
            </a>
          </div>
        </article>
        <article className="common-status-card common-status-card--security">
          <span className="common-status-card__icon">
            <ShieldCheck aria-hidden="true" size={30} />
          </span>
          <div className="common-status-card__main">
            <h4>{t("overview.securityConfirmation")}</h4>
            <div className="common-security-facts">
              <div>
                <strong>{t("overview.securityGate")}</strong>
                <span className="common-mode-pill common-mode-pill--security">{statusLabelForChip(securityGate, t)}</span>
              </div>
              <div>
                <strong>{t("summary.partialFailures")}</strong>
                <span className="common-mode-pill common-mode-pill--auto">{failures.length ? `${failures.length}` : t("summary.none")}</span>
              </div>
            </div>
          </div>
          <a className="common-status-link common-status-link--security" href="#safety">
            {t("summary.viewDetails")}
            <ArrowRightCircle aria-hidden="true" size={15} />
          </a>
        </article>
      </div>
    </section>
  );
}

function WorkflowStatusCards({ data, t }) {
  const context = selectedContextData(data);
  const productAuthority = data.development?.product_authority || {};
  const nextAction = nextActionShort(context, data, t);
  const cards = [
    { id: "git-sync", title: t("workflow.card.gitSync"), Icon: RefreshCw, status: context.git_status, value: workflowStatusLabel(context.git_status, t), detail: normalizeState(context.git_status) === "passed" || normalizeState(context.git_status) === "ready" ? t("workflow.card.gitSyncDetail") : t("workflow.card.gitSyncReviewDetail"), button: t("summary.viewDetails") },
    { id: "ci", title: t("workflow.card.ci"), Icon: CheckCircle2, status: context.ci_status, value: workflowStatusLabel(context.ci_status, t), detail: normalizeState(context.ci_status) === "passed" || normalizeState(context.ci_status) === "ready" ? repositoryDisplayName(context.target_repository?.name, t) : t("workflow.card.ciReviewDetail"), button: t("summary.viewDetails") },
    { id: "pr-merge", title: t("workflow.card.prMerge"), Icon: GitPullRequest, status: data.git_workflow?.approval_status, value: workflowStatusLabel(data.git_workflow?.approval_status, t), detail: t("workflow.card.prMergeDetail"), button: t("summary.viewDetails") },
    { id: "product-evidence", title: t("workflow.card.productEvidence"), Icon: Folder, status: productAuthority.status || context.product_authority_status || "manual_required", value: productEvidenceStatusLabel(productAuthority, t), detail: productEvidenceDetail(productAuthority, t), button: t("workflow.card.collectEvidence") },
    { id: "next-step", title: t("workflow.card.nextStep"), Icon: Flag, status: context.status || "ready", value: currentStepShortDisplay(context, t), detail: nextAction || currentStepDetailDisplay(context, t), button: workflowStepDetailLabel(context, t) },
  ];
  return (
    <section className="workflow-card-grid" aria-label={t("workflow.currentEvidence")}>
      {cards.map(({ id, title, Icon, value, detail, button, status }) => (
        <article className={`workflow-mini-card workflow-mini-card--${id}`} key={id}>
          <span className="workflow-mini-card__icon">
            <Icon aria-hidden="true" size={24} />
          </span>
          <h3>{title}</h3>
          <strong>{value}</strong>
          <p>{detail}</p>
          <InsightDetailButton
            className="mini-card-button"
            detail={workflowCardInsight(id, { title, value, detail, status }, context, data, t)}
            label={button}
            t={t}
            tone="workflow"
          />
        </article>
      ))}
    </section>
  );
}

function workflowCardInsight(id, card, context, data, t) {
  const productAuthority = data.development?.product_authority || {};
  const ciGuidancePoints = id === "product-evidence" ? productAuthorityCiGuidancePoints(productAuthority, t) : [];
  return {
    title: card.title,
    eyebrow: t("workflow.detail.eyebrow"),
    summary: card.detail,
    where: t(`workflow.detail.${id}.where`, t("workflow.detail.default.where")),
    why: t(`workflow.detail.${id}.why`, t("workflow.detail.default.why")),
    action: ciGuidancePoints.length ? t("workflow.ciEvidence.action") : t(`workflow.detail.${id}.action`, t("workflow.detail.default.action")),
    source: workflowCardSource(id, context, data, t),
    status: card.status || "unknown",
    statusLabel: card.value,
    points: ciGuidancePoints,
  };
}

function workflowCardSource(id, context, data, t) {
  const rawTargetName = displayText(context.target_repository?.name, "");
  const targetName = rawTargetName ? repositoryDisplayName(rawTargetName, t) : "";
  const map = {
    "git-sync": t("workflow.reference.gitSync"),
    ci: t("workflow.reference.ci"),
    "pr-merge": t("workflow.reference.selectedContext"),
    "product-evidence": t("workflow.reference.productAuthority"),
    "next-step": displayText(context.current_step_id, t("workflow.run.nextStep")),
  };
  return targetName ? `${map[id] || t("workflow.reference.selectedContext")} / ${targetName}` : map[id] || t("workflow.reference.selectedContext");
}

function WorkflowRecentTable({ rows: recentRows, data, t }) {
  const rows = asArray(recentRows).slice(0, 5);
  const context = selectedContextData(data);
  if (!rows.length) {
    return null;
  }
  return (
    <section className="mock-table-section mock-table-section--workflow" aria-labelledby="workflow-recent-heading">
      <h3 id="workflow-recent-heading">{t("workflow.recentRuns")}</h3>
      <div className="mock-table">
        <div className="mock-table__head mock-table__head--workflow">
          <span>{t("workflow.table.time")}</span>
          <span>{t("workflow.table.type")}</span>
          <span>{t("workflow.table.target")}</span>
          <span>{t("workflow.table.detail")}</span>
          <span>{t("workflow.table.status")}</span>
          <span>{t("workflow.table.reference")}</span>
        </div>
        {rows.map((row) => (
          <article className="mock-table-row mock-table-row--workflow" key={displayText(row.id)}>
            <span data-label={t("workflow.table.time")}>{formatDashboardDateTime(row.time) || t("workflow.table.snapshotEvidence")}</span>
            <strong data-label={t("workflow.table.type")}>{workflowRunTypeLabel(row.type, t)}</strong>
            <span data-label={t("workflow.table.target")}>{workflowRunTarget(row, context, t)}</span>
            <p data-label={t("workflow.table.detail")}>{workflowRunDetail(row, context, t)}</p>
            <span className="mock-table-row__status" data-label={t("workflow.table.status")}>
              <StatusPill value={row.status} t={t} label={workflowStatusLabel(row.status, t)} />
            </span>
            <span className="mock-table-row__reference" data-label={t("workflow.table.reference")}>
              <InsightDetailButton
                className="mock-table-link"
                detail={workflowRunInsight(row, context, t)}
                label={workflowRunReferenceLabel(row.reference, t)}
                t={t}
                tone="workflow"
              />
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function workflowRunInsight(row, context, t) {
  const reference = displayText(row.reference, "");
  const role = displayText(row.source_role, "workflow");
  const status = normalizeState(row.status);
  const rawCommand = displayText(row.required_command, "");
  const command = rawCommand === "not_applicable" ? "" : rawCommand;
  const observedAt = formatDashboardDateTime(row.observed_at) || formatDashboardDateTime(row.time);
  const evidencePath = displayText(row.evidence_path, "");
  const action = t(`workflow.runReferenceAction.${role}.${status}`, "") || t(`workflow.runReferenceAction.${role}`, t("workflow.runReference.action"));
  const points = [
    `${t("workflow.runReference.scope")}: ${workflowRunScopeLabel(row, context, t)}`,
    `${t("workflow.runReference.role")}: ${t(`workflow.runReferenceRole.${role}`, displayKey(role))}`,
    `${t("workflow.runReference.target")}: ${workflowRunTarget(row, context, t)}`,
  ];
  if (observedAt) {
    points.push(`${t("workflow.runReference.observedAt")}: ${observedAt}`);
  }
  if (evidencePath) {
    points.push(`${t("workflow.runReference.evidencePath")}: ${evidencePath}`);
  }
  return {
    title: workflowRunReferenceLabel(reference, t),
    eyebrow: workflowRunTypeLabel(row.type, t),
    summary: workflowRunDetail(row, context, t),
    where: workflowRunReferenceWhere(row, context, t),
    why: t(`workflow.referenceMeaning.${role}`, t(`workflow.referenceMeaning.${reference}`, t("workflow.referenceMeaning.default"))),
    action: command ? `${action} ${t("workflow.runReference.command")}: ${command}` : action,
    source: workflowRunTarget(row, context, t),
    status: row.status,
    statusLabel: workflowStatusLabel(row.status, t),
    points,
  };
}

function EvidenceRowsTable({ rows, t, displayPolicy = null }) {
  const items = asArray(rows);
  if (!items.length) {
    return null;
  }
  return (
    <section className="evidence-table-section" aria-labelledby="evidence-table-heading">
      <h3 id="evidence-table-heading">{t("maintenance.evidenceTable")}</h3>
      <div className="evidence-table">
        <div className="evidence-table__head">
          <span>{t("detail.confirm.what")}</span>
          <span>{t("detail.confirm.why")}</span>
          <span>{t("detail.confirm.status")}</span>
          <span>{t("maintenance.reference")}</span>
        </div>
        {items.map((row) => {
          const unresolvedCount = maintenanceUnresolvedCount(row);
          const observedAt = maintenanceObservedAt(row);
          const referenceValues = maintenanceReferenceValues(row);
          const referenceChips = referenceValues.map((reference) => (
            <span className="evidence-row__reference-chip" key={reference} aria-label={`${maintenanceEvidenceLabel(row, t)}: ${reference}`}>
              {technicalTooltipValue(reference, referenceTooltip(reference, t, t("maintenance.evidenceReferenceTooltip")), "evidence-row__reference-value")}
              <button className="evidence-row__reference-copy" type="button" aria-label={`${t("maintenance.copyReference")}: ${reference}`} data-copy-tooltip={reference} onClick={() => copyTextToClipboard(reference)}>
                <Copy aria-hidden="true" size={14} />
              </button>
            </span>
          ));
          return (
            <article className="evidence-row" key={displayText(row.id)}>
              <div className="evidence-row__title">
                {(() => {
                  const Icon = maintenanceEvidenceIcon(row.id);
                  return <Icon aria-hidden="true" size={20} />;
                })()}
                <div>
                  <strong>{maintenanceEvidenceLabel(row, t)}</strong>
                  <span>{maintenanceEvidenceTarget(row, t)}</span>
                </div>
                {unresolvedCount > 0 ? <span className="small-badge small-badge--warning">{maintenanceUnresolvedLabel(unresolvedCount, t)}</span> : null}
              </div>
              <div className="evidence-row__body">
                <p>{maintenanceEvidenceWhy(row.id, t)}</p>
                {observedAt ? <span>{t("maintenance.updatedAt")}: {observedAt}</span> : null}
                <span>{t("maintenance.evidencePoint.priority")}: {maintenancePriorityLabel(row, t)}</span>
              </div>
              <StatusPill value={row.status} t={t} label={maintenanceStatusLabel(row.id, row.status, t)} />
              <div className="evidence-row__reference">
                <InsightDetailButton
                  className="evidence-row__detail"
                  detail={maintenanceEvidenceInsight(row, t)}
                  label={t("maintenance.evidenceDetail")}
                  t={t}
                  tone="maintenance"
                />
                {displayPolicy?.collapseTechnicalDetails && referenceChips.length ? (
                  <details className="evidence-row__technical" data-dashboard-display-depth={displayPolicy.depth} open={displayPolicy.openTechnicalDetails}>
                    <summary>{t("settingsPage.modal.technicalDetails")}</summary>
                    {referenceChips}
                  </details>
                ) : referenceChips}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function maintenanceEvidenceIcon(id) {
  const map = {
    dashboard_data_schema: FileJson,
    product_authority_evidence: FileSearch,
    git_workflow_settings: GitBranch,
    security_policy: ShieldCheck,
    developer_memory: Brain,
    workflow_pair: Waypoints,
    browser_debug_agent_handoff: TerminalSquare,
  };
  return map[displayText(id, "")] || FileCheck2;
}

function SecurityStatusCards({ security, partialFailures, data, t }) {
  const failures = asArray(partialFailures);
  const approvals = asArray(security?.approvals);
  const dangerous = asArray(security?.dangerous_operations);
  const lastChecked = formatDashboardTime(approvals[0]?.last_checked || dangerous[0]?.last_checked || data.generated_at);
  const cards = [
    { id: "gate", title: t("security.item.gate"), Icon: ShieldCheck, status: security?.gate_status, value: statusLabelForChip(security?.gate_status, t), detail: securityGateDetail(security, failures, t) },
    { id: "approval", title: t("security.approvals"), Icon: UserCheck, status: approvals[0]?.status || security?.dangerous_action_approval, value: approvals.length ? statusLabelForChip(approvals[0]?.status || security?.dangerous_action_approval, t) : t("security.card.noApprovalWaiting"), detail: securityApprovalDetail(approvals[0], security?.dangerous_action_approval, t) },
    { id: "dangerous", title: t("security.dangerousOperations"), Icon: AlertTriangle, status: dangerous[0]?.status || "ready", value: dangerous.length ? `${dangerous.length}` : t("summary.none"), detail: securityDangerousOperationDetail(dangerous[0], t) },
    { id: "partial", title: t("summary.partialFailures"), Icon: CircleMinus, status: failures.length ? failures[0].status : "ready", value: failures.length ? `${failures.length}` : t("summary.none"), detail: securityPartialDetail(failures, t) },
  ];
  return (
    <section className="security-card-grid" aria-label={t("security.title")}>
      {cards.map(({ id, title, Icon, status, value, detail }) => (
        <article className={`security-mini-card security-mini-card--${id}`} key={id}>
          <span className="security-mini-card__icon">
            <Icon aria-hidden="true" size={26} />
          </span>
          <h3>{title}</h3>
          <StatusPill value={status} t={t} label={value} />
          <p>{detail}</p>
          {lastChecked ? <small>{t("security.lastChecked")}: {lastChecked}</small> : null}
        </article>
      ))}
    </section>
  );
}

function ContextPanel({ data, t, activeMenuId, activeContext, onActiveMenuChange }) {
  const context = activeContext && typeof activeContext === "object" ? activeContext : selectedContextData(data);
  const availableContexts = asArray(data.available_contexts);
  const selectedMenuId = displayText(activeMenuId || context.menu_id, availableContexts[0]?.menu_id || "unknown");

  if (!availableContexts.length && !displayText(context.menu_id, "")) {
    return null;
  }

  const selectedAvailable =
    availableContexts.find((availableContext) => displayText(availableContext.menu_id, "") === selectedMenuId) ||
    availableContexts[0] ||
    {};
  const targetRepository = context.target_repository || {};
  const selectedStatus = context.evidence_status || selectedAvailable.status;
  const blockers = asArray(context.blockers);
  const selectorOptions = availableContexts.length ? availableContexts : [{ menu_id: selectedMenuId, workflow_context: context.workflow_context, status: selectedStatus }];
  const repositorySelection = repositorySelectionForMenu(data, selectedMenuId);

  return (
    <section className="context-panel" aria-label={t("context.title")}>
      <div className="context-panel__control">
        <label htmlFor="dashboard-context-select">
          <Compass aria-hidden="true" size={18} />
          <span>{t("context.selectLabel")}</span>
        </label>
        <select id="dashboard-context-select" value={selectedMenuId} onChange={(event) => onActiveMenuChange?.(event.target.value)}>
          {selectorOptions.map((context) => {
            const id = displayText(context.menu_id, "unknown");
            const selectable = isAvailableContextSelectable(context) || id === selectedMenuId;
            return (
              <option value={id} key={id} disabled={!selectable}>
                {contextLabel(id, t)}
                {!selectable ? ` - ${t("context.menuAvailability.unavailable")}` : ""}
              </option>
            );
          })}
        </select>
      </div>
      <div className="context-panel__summary">
        <div className="context-panel__title">
          <span className="context-panel__icon">
            <WorkflowCategoryIcon aria-hidden="true" size={22} />
          </span>
          <div>
            <strong>{contextLabel(selectedMenuId, t)}</strong>
            <span>{workflowContextLabel(context.workflow_context || selectedAvailable.workflow_context, t)}</span>
          </div>
        </div>
        <StatusPill value={selectedStatus} t={t} />
      </div>
      <div className="context-panel__facts">
        <ActionMetaRow Icon={Database} label={t("context.repository")}>
          {repositoryDisplayName(targetRepository.name || selectedAvailable.target_repository_name, t)}
        </ActionMetaRow>
        <ActionMetaRow Icon={MapPinIcon} label={t("context.currentStep")}>
          {currentStepTextDisplay(context, t)}
        </ActionMetaRow>
        <ActionMetaRow Icon={ShieldCheck} label={t("context.security")}>
          {stateLabel(context.security_status, t)}
        </ActionMetaRow>
        <ActionMetaRow Icon={GitBranch} label={t("context.gitCi")}>
          {`${stateLabel(context.git_status, t)} / ${stateLabel(context.ci_status, t)}`}
        </ActionMetaRow>
      </div>
      <RepositorySelectionPanel selection={repositorySelection} t={t} />
      <div className="context-panel__footer">
        <span>
          <AlertTriangle aria-hidden="true" size={16} />
          {t("context.blockers")}: {blockers.length}
        </span>
        <span>
          <Lock aria-hidden="true" size={16} />
          {t("context.readOnly")}
        </span>
      </div>
    </section>
  );
}

function repositorySelectionForMenu(data, menuId) {
  const selection = data?.repository_selection;
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return null;
  }
  if (displayText(selection.menu_id, "") !== displayText(menuId, "")) {
    return null;
  }
  if (normalizeState(selection.status) === "not_applicable") {
    return null;
  }
  return selection;
}

function repositorySelectionStateLabel(value, t) {
  return t(`context.repositorySelection.state.${displayText(value, "none")}`, displayKey(value));
}

function repositorySelectionSourceLabel(value, t) {
  return t(`context.repositorySelection.source.${displayText(value, "unknown")}`, displayKey(value));
}

function repositorySelectionAllowedContexts(option, t) {
  const contexts = asArray(option.allowed_contexts).map((context) => contextLabel(context, t));
  return contexts.length ? contexts.join(" / ") : t("context.repositorySelection.none");
}

function RepositorySelectionCommand({ command, selected, t }) {
  const text = displayText(command, "");
  if (!text) {
    return null;
  }
  return (
    <div className="repository-selection__command" aria-label={t("context.repositorySelection.command")}>
      <span className="repository-selection__command-label">
        <TerminalSquare aria-hidden="true" size={14} />
        {selected ? t("context.repositorySelection.commandSelected") : t("context.repositorySelection.command")}
      </span>
      <code>{text}</code>
      <button className="repository-selection__copy" type="button" aria-label={`${t("app.copyItem")}: ${text}`} data-copy-tooltip={text} onClick={() => copyTextToClipboard(text)}>
        <Copy aria-hidden="true" size={14} />
      </button>
    </div>
  );
}

function RepositorySelectionOption({ option, t }) {
  const selected = option.selected === true;
  const selectable = option.selectable === true;
  const Icon = selected ? Check : selectable ? Database : Lock;
  return (
    <article className={`repository-selection__option${selected ? " is-selected" : ""}${selectable ? "" : " is-disabled"}`} data-repository-option={displayText(option.repo_id, "")}>
      <div className="repository-selection__option-main">
        <span className="repository-selection__option-icon">
          <Icon aria-hidden="true" size={17} />
        </span>
        <div>
          <strong>{repositoryDisplayName(option.display_name, t)}</strong>
          <small>{displayText(option.repo_id, "")}</small>
        </div>
      </div>
      <StatusPill value={option.status} t={t} label={selected ? t("context.repositorySelection.selected") : statusLabelForChip(option.status, t)} />
      <dl className="repository-selection__option-meta">
        <div>
          <dt>{t("context.repositorySelection.productType")}</dt>
          <dd>{t(`repositoryInfo.productType.${displayText(option.product_type, "unknown")}`, displayKey(option.product_type))}</dd>
        </div>
        <div>
          <dt>{t("context.repositorySelection.allowedContexts")}</dt>
          <dd>{repositorySelectionAllowedContexts(option, t)}</dd>
        </div>
        <div>
          <dt>{t("context.repositorySelection.pathState")}</dt>
          <dd>{t(`repositoryInfo.pathState.${displayText(option.path_state, "unknown")}`, displayKey(option.path_state))}</dd>
        </div>
        <div>
          <dt>{t("context.repositorySelection.gitState")}</dt>
          <dd>{t(`repositoryInfo.pathState.${displayText(option.git_state, "unknown")}`, displayKey(option.git_state))}</dd>
        </div>
        <div>
          <dt>{t("context.repositorySelection.source")}</dt>
          <dd>{repositorySelectionSourceLabel(option.registration_source, t)}</dd>
        </div>
      </dl>
      {!selectable ? <p className="repository-selection__reason">{t(option.disabled_reason_key, displayText(option.disabled_detail, ""))}</p> : null}
      <RepositorySelectionCommand command={option.select_command} selected={selected} t={t} />
    </article>
  );
}

function RepositorySelectionPanel({ selection, t }) {
  if (!selection) {
    return null;
  }
  const options = asArray(selection.options);
  const currentName = repositoryDisplayName(selection.current_repository_name, t);
  return (
    <section className="repository-selection" aria-labelledby="repository-selection-heading">
      <div className="repository-selection__head">
        <div>
          <h3 id="repository-selection-heading">{t("context.repositorySelection.title")}</h3>
          <p>{t("context.repositorySelection.detail")}</p>
        </div>
        <StatusPill value={selection.status} t={t} />
      </div>
      <div className="repository-selection__current">
        <ActionMetaRow Icon={Database} label={t("context.repositorySelection.current")}>
          {currentName}
        </ActionMetaRow>
        <ActionMetaRow Icon={CircleDashed} label={t("context.repositorySelection.selectionState")}>
          {repositorySelectionStateLabel(selection.selection_state, t)}
        </ActionMetaRow>
        <ActionMetaRow Icon={FileText} label={t("context.repositorySelection.sources")}>
          {`${displayText(selection.registry_file, "")} / ${displayText(selection.selection_file, "")}`}
        </ActionMetaRow>
      </div>
      {options.length ? (
        <div className="repository-selection__options" role="list" aria-label={t("context.repositorySelection.candidates")}>
          {options.map((option) => (
            <div role="listitem" key={displayText(option.repo_id, "")}>
              <RepositorySelectionOption option={option} t={t} />
            </div>
          ))}
        </div>
      ) : (
        <div className="repository-selection__empty" role="status">
          <Lock aria-hidden="true" size={16} />
          <span>{t("context.repositorySelection.noCandidates")}</span>
        </div>
      )}
    </section>
  );
}

function MapPinIcon(props) {
  return <Target {...props} />;
}

function localizedMeta(t, namespace, id, fallback = "") {
  return t(`${namespace}.${id}`, fallback || displayKey(id));
}

function sourceLabel(source, t) {
  return localizedMeta(t, "source.label", displayText(source), displayKey(source));
}

function sourceDetector(source, t) {
  return localizedMeta(t, "source.detector", displayText(source), displayKey(source));
}

function sourceReasonHint(source, t) {
  return localizedMeta(t, "source.reason", displayText(source), "");
}

function sourceWhy(source, t) {
  return localizedMeta(t, "source.why", displayText(source), "");
}

function commandIntentLabel(intent, t) {
  const key = displayText(intent).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return t(`command.intent.${key}`, displayText(intent));
}

function commandTargetLabel(target, t) {
  const key = displayText(target).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return t(`command.target.${key}`, displayText(target));
}

function commandGateLabel(gateId, t) {
  const key = displayText(gateId, "unknown").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return t(`command.gate.${key}`, displayKey(gateId));
}

function commandExecutionModeLabel(mode, t) {
  const key = displayText(mode, "unknown").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return t(`command.mode.${key}`, displayKey(mode));
}

function stateLabel(state, t) {
  const normalized = normalizeState(state);
  return t(`state.${normalized}`, displayText(normalized));
}

function technicalChip(value) {
  const text = displayText(value, "");
  return text ? <code className="technical-chip">{text}</code> : null;
}

function technicalTooltipValue(value, tooltip, className = "") {
  const text = displayText(value, "");
  if (!text) {
    return null;
  }
  return (
    <span className={`technical-tooltip-value ${className}`.trim()} data-tooltip={displayText(tooltip, "")}>
      {technicalChip(text)}
    </span>
  );
}

function referenceTooltip(value, t, fallback = "") {
  const text = displayText(value, "");
  if (!text) {
    return displayText(fallback, "");
  }
  if (/\s/.test(text)) {
    return displayText(fallback, "");
  }
  return repositoryFileRoleLabel({ path: text, source_id: text }, t) || displayText(fallback, "");
}

function sourceCommandRoleKey(value) {
  return displayText(value, "generic").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "generic";
}

function sourceFileRoleLabel(value, t, fallback = "") {
  const path = displayText(value, "").replace(/^product:/, "");
  if (!path) {
    return displayText(fallback, "");
  }
  const exact = {
    "AGENTS.MD": "maintenance.sourceFileRole.agents",
    "guides/DOCUMENT_MAP.md": "maintenance.sourceFileRole.documentMap",
    "docs/workflow/DASHBOARD_DATA_SCHEMA.tsv": "maintenance.sourceFileRole.dashboardSchema",
    "docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv": "maintenance.sourceFileRole.asBuiltContract",
    "docs/workflow/DOCUMENT_DECISION_BRIEFS.tsv": "maintenance.sourceFileRole.documentDecisionBriefs",
    "docs/workflow/TEST_PLAN_MANIFEST.tsv": "maintenance.sourceFileRole.testPlanManifest",
    "docs/workflow/GIT_HOOK_CHECKS.tsv": "maintenance.sourceFileRole.gitHookChecks",
    "docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv": "maintenance.sourceFileRole.gitHookGroups",
    "docs/workflow/FINAL_GATE_COVERAGE.tsv": "maintenance.sourceFileRole.finalGateCoverage",
    "docs/workflow/GIT_WORKFLOW_POLICY.tsv": "maintenance.sourceFileRole.gitWorkflowPolicy",
    "docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv": "maintenance.sourceFileRole.productGitPolicy",
    "docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv": "maintenance.sourceFileRole.menuProfilePolicy",
    "docs/workflow/PRODUCT_SECURITY_POLICY.tsv": "maintenance.sourceFileRole.productSecurityPolicy",
    "docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv": "maintenance.sourceFileRole.productRepositoryStructure",
    "docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv": "maintenance.sourceFileRole.productRepositoryForbiddenPaths",
    "docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv": "maintenance.sourceFileRole.productGateEvidenceSchema",
    "learning/context/WORKFLOW_CONTEXT_MAP.tsv": "maintenance.sourceFileRole.workflowContextMap",
    "learning/GIT_WORKFLOW_SETTINGS.tsv": "maintenance.sourceFileRole.gitWorkflowSettings",
    "learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv": "maintenance.sourceFileRole.productGitUsageSettings",
    "learning/GIT_WORKFLOW_APPROVALS.tsv": "maintenance.sourceFileRole.gitWorkflowApprovals",
    "lesson/LESSON_CONFIG.tsv": "maintenance.sourceFileRole.lessonConfig",
    "lesson/LESSON_CONFIG_14_DAYS.tsv": "maintenance.sourceFileRole.lessonConfig",
    "learning/LESSON_STATE.tsv": "maintenance.sourceFileRole.lessonState",
    "learning/LESSON_STATE_14_DAYS.tsv": "maintenance.sourceFileRole.lessonState",
    "learning/LESSON_MODE.tsv": "maintenance.sourceFileRole.lessonMode",
    "learning/LESSON_MODE_14_DAYS.tsv": "maintenance.sourceFileRole.lessonMode",
    "learning/WORKFLOW_DISPLAY_LANGUAGE.tsv": "maintenance.sourceFileRole.workflowLanguage",
    "learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv": "maintenance.sourceFileRole.workflowLanguage",
    "learning/PRODUCT_DEVELOPMENT_LANGUAGE.tsv": "maintenance.sourceFileRole.productLanguage",
    "learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv": "maintenance.sourceFileRole.productLanguage",
    "learning/LESSON_APPROVALS_14_DAYS.tsv": "maintenance.sourceFileRole.lessonApprovals",
    "docs/as-built/REQUIREMENTS.md": "maintenance.sourceFileRole.requirements",
    "docs/as-built/SPECIFICATION.md": "maintenance.sourceFileRole.specification",
    "docs/as-built/IMPLEMENTATION_PLAN.md": "maintenance.sourceFileRole.implementationPlan",
    "docs/workflow/TASK_TRACKER.md": "maintenance.sourceFileRole.taskTracker",
    "docs/workflow/HANDOFF.md": "maintenance.sourceFileRole.handoff",
    "docs/memory/DEVELOPER_MEMORY.md": "maintenance.sourceFileRole.developerMemory",
  };
  const exactKey = exact[path];
  if (exactKey) {
    return t(exactKey, displayText(fallback, ""));
  }
  if (path.startsWith("docs/workflow/")) {
    return t("maintenance.sourceFileRole.workflowDocument", displayText(fallback, ""));
  }
  if (path.startsWith("learning/")) {
    return t("maintenance.sourceFileRole.learningSetting", displayText(fallback, ""));
  }
  return referenceTooltip(path, t, fallback);
}

function sourceBoundaryTooltip(value, variant, t, fallback = "") {
  const text = displayText(value, "");
  if (variant === "commands") {
    if (text.includes("product-repository-authority")) {
      return t("maintenance.sourceCommandRole.productAuthorityContext", displayText(fallback, ""));
    }
    if (text.includes("check_git_sync")) {
      return t("maintenance.sourceCommandRole.productGitSync", displayText(fallback, ""));
    }
    if (text.includes("check_ci_status")) {
      return t("maintenance.sourceCommandRole.productCiStatus", displayText(fallback, ""));
    }
    if (text.includes("product-security")) {
      return t("maintenance.sourceCommandRole.productSecurityGate", displayText(fallback, ""));
    }
    return t(`maintenance.sourceCommandRole.${sourceCommandRoleKey(text)}`, displayText(fallback, ""));
  }
  if (variant === "files") {
    return sourceFileRoleLabel(text, t, fallback);
  }
  return referenceTooltip(text, t, fallback);
}

function copyTextToClipboard(value) {
  const text = displayText(value, "");
  if (!text) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function InsightDetailButton({ detail, t, label, className = "", tone = "default" }) {
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef(null);
  const closeRef = useRef(null);
  const title = detail?.title || t("detail.infoTitle");
  const bodyId = `insight-detail-${String(title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        openerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    openerRef.current?.focus();
  };

  return (
    <>
      <button
        className={`insight-detail-button insight-detail-button--${tone} ${className}`.trim()}
        type="button"
        ref={openerRef}
        onClick={() => setIsOpen(true)}
      >
        <CircleHelp aria-hidden="true" size={15} />
        {label || t("detail.openPlainDetail")}
      </button>
      {isOpen ? (
        <div className="insight-detail-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}>
          <section className="insight-detail-modal__panel" role="dialog" aria-modal="true" aria-labelledby={`${bodyId}-title`} aria-describedby={`${bodyId}-summary`}>
            <header className="insight-detail-modal__head">
              <div>
                {detail?.eyebrow ? <span className="insight-detail-modal__eyebrow">{detail.eyebrow}</span> : null}
                <h3 id={`${bodyId}-title`}>{title}</h3>
              </div>
              <button className="insight-detail-modal__close" type="button" ref={closeRef} onClick={close} aria-label={t("detail.closeDetail")}>
                <CircleX aria-hidden="true" size={18} />
              </button>
            </header>
            {detail?.summary ? <p className="insight-detail-modal__summary" id={`${bodyId}-summary`}>{detail.summary}</p> : null}
            <dl className="insight-detail-modal__grid">
              {[
                [t("detail.whereItAppears"), detail?.where],
                [t("detail.whyItMatters"), detail?.why],
                [t("detail.nextSafeAction"), detail?.action],
                [t("detail.technicalSource"), detail?.source],
              ]
                .filter(([, value]) => displayText(value, ""))
                .map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{displayText(value)}</dd>
                  </div>
                ))}
            </dl>
            {detail?.status ? (
              <div className="insight-detail-modal__status">
                <StatusPill value={detail.status} t={t} label={detail.statusLabel || statusLabelForChip(detail.status, t)} />
              </div>
            ) : null}
            {asArray(detail?.points).length ? (
              <ul className="insight-detail-modal__points">
                {asArray(detail.points).map((point, index) => (
                  <li key={`${displayText(point)}-${index}`}>{displayText(point)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function showMoreItemsLabel(remaining, t) {
  const prefix = t("app.showMoreItemsPrefix", "");
  const suffix = t("app.showMoreItemsSuffix", "");
  return `${prefix ? `${prefix} ` : ""}${remaining} ${t("summary.moreItems")}${suffix}`;
}

function SourceBoundaryChips({ values, t, limit = 3, variant = "default", labelKey = "maintenance.sourceItem", tooltipKey = "maintenance.sourceRoleTooltip" }) {
  const [expanded, setExpanded] = useState(false);
  const normalized = asArray(values).map((value) => displayText(value, "")).filter(Boolean);
  if (!normalized.length) {
    return <span>{t("summary.none")}</span>;
  }
  const visible = expanded ? normalized : normalized.slice(0, limit);
  const remaining = Math.max(0, normalized.length - limit);
  return (
    <div className={`source-boundary__chips source-boundary__chips--${variant}${expanded ? " source-boundary__chips--expanded" : ""}`}>
      {visible.map((value, index) => {
        const tooltip = sourceBoundaryTooltip(value, variant, t, t(tooltipKey));
        return (
          <span className="source-boundary__chip" key={`${value}-${index}`} aria-label={`${t(labelKey)} ${index + 1}: ${value}`} data-tooltip={tooltip}>
            {technicalTooltipValue(value, tooltip, "source-boundary__chip-value")}
            <button className="source-boundary__chip-copy" type="button" aria-label={`${t("app.copyItem")}: ${value}`} data-copy-tooltip={value} onClick={() => copyTextToClipboard(value)}>
              <Copy aria-hidden="true" size={14} />
            </button>
          </span>
        );
      })}
      {remaining > 0 ? (
        <button className="source-boundary__expand" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? t("app.hideExtraItems") : showMoreItemsLabel(remaining, t)}
        </button>
      ) : null}
    </div>
  );
}

function formatGenerated(data, locale) {
  return data?.generated_at ? formatDashboardDateTime(data.generated_at) || formatDateTime(data.generated_at, locale) : "";
}

function formatDashboardDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatDashboardTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function normalizedStepCountLabel(value) {
  const text = displayText(value, "");
  const match = text.match(/step\s*(\d+)\s*\/\s*(\d+)/i);
  return match ? `Step ${match[1]} / ${match[2]}` : "";
}

function stepTitleFromSlug(value) {
  return displayText(value, "")
    .split(".")
    .slice(1)
    .join(".")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function selectedStepParts(context) {
  const label = displayText(context.current_step_label || "", "");
  const id = displayText(context.current_step_id, "");
  const explicitStep = normalizedStepCountLabel(label);
  if (explicitStep) {
    const detail = label
      .replace(/step\s*\d+\s*\/\s*\d+/i, "")
      .replace(/^(\s*[-:]\s*)+/, "")
      .trim();
    return { short: explicitStep, detail: detail || (label === id ? stepTitleFromSlug(id) : displayText(id, "")), id };
  }

  const dayMatch = id.match(/^day(\d+)\./i);
  if (dayMatch) {
    const menuId = displayText(context.menu_id, "");
    const total = menuId === "step_1_7" ? 7 : 14;
    return { short: `Step ${dayMatch[1]} / ${total}`, detail: label && label !== id ? label : stepTitleFromSlug(id), id };
  }

  const index = Number.isInteger(context.current_step_index) ? context.current_step_index : null;
  const total = Number.isInteger(context.current_step_total) ? context.current_step_total : null;
  const short = index && total ? `Step ${index} / ${total}` : displayText(label || id);
  const detail = label && label !== short && label !== id ? label : stepTitleFromSlug(id);
  return { short, detail, id };
}

function selectedStepText(context, { includeId = false } = {}) {
  const { short, detail, id } = selectedStepParts(context);
  if (includeId && id) {
    return `${short} ${id}`;
  }
  return detail ? `${short} ${detail}` : short;
}

function selectedStepShort(context) {
  return selectedStepParts(context).short;
}

function selectedStepDetail(context) {
  return selectedStepParts(context).detail;
}

function localizedStepDetail(context, t) {
  const id = displayText(context.current_step_id, "");
  const translated = id ? t(`lesson.step.${id}`, "") : "";
  return translated || selectedStepDetail(context);
}

function isLessonWorkflowContext(context) {
  return displayText(context.workflow_context, "") === "lesson";
}

function currentWorkflowStepLabel(context, t) {
  if (isLessonWorkflowContext(context)) {
    return "";
  }
  return workflowContextLabel(context.workflow_context || context.menu_id, t);
}

function currentStepShortDisplay(context, t) {
  return currentWorkflowStepLabel(context, t) || selectedStepShort(context);
}

function currentStepDetailDisplay(context, t) {
  if (!isLessonWorkflowContext(context)) {
    return nextActionShort(context, {}, t) || t("summary.viewDetails");
  }
  return localizedStepDetail(context, t);
}

function currentStepTextDisplay(context, t) {
  const workflowLabel = currentWorkflowStepLabel(context, t);
  if (workflowLabel) {
    return workflowLabel;
  }
  return selectedStepText(context);
}

function localizedLessonAction(value, context, t) {
  const text = displayText(value, "");
  if (!text) {
    return "";
  }
  const currentStepId = displayText(context?.current_step_id, "");
  if (text === "Review selected context" && currentStepId === "day12.subagents-plan") {
    return t("lesson.nextAction.reviewSubagentsPlan");
  }
  const knownActions = {
    "Review selected context": "lesson.nextAction.reviewSelectedContext",
    "Restore the lesson state source before continuing.": "lesson.nextAction.reviewLearningSettings",
    "Select missing lesson settings before passing the next lesson step.": "lesson.nextAction.reviewLearningSettings",
    "Review the current step and obtain the required approval before passing it.": "lesson.nextAction.reviewCurrentStep",
    "Request learner approval before starting the applied lesson workflow.": "lesson.nextAction.requestAppliedApproval",
  };
  return knownActions[text] ? t(knownActions[text]) : text;
}

function contextProgress(context, fallbackMetric = {}) {
  const total = Number(context?.current_step_total);
  const index = Number(context?.current_step_index);
  if (Number.isInteger(total) && total > 0 && Number.isInteger(index) && index >= 0) {
    const completed = Math.min(total, Math.max(0, index > 0 ? index - 1 : 0));
    return {
      completed,
      total,
      percent: clampPercent((completed / total) * 100),
      source: "context",
    };
  }
  return {
    completed: Number.isInteger(fallbackMetric?.healthy) ? fallbackMetric.healthy : 0,
    total: Number.isInteger(fallbackMetric?.total) ? fallbackMetric.total : 0,
    percent: clampPercent(fallbackMetric?.percent),
    source: "metric",
  };
}

function nextActionShort(context, data, t) {
  const action = context.next_safe_action || data.summary?.primary_action || {};
  const text = displayText(action.title || action.description, "");
  return t ? localizedLessonAction(text, context, t) : text;
}

function statusLabelForChip(value, t) {
  const state = normalizeState(value);
  const mockLabels = {
    ready: "mock.status.ready",
    passed: "mock.status.passed",
    failed: "mock.status.failed",
    blocked: "mock.status.blocked",
    unknown: "mock.status.unknown",
    optional: "mock.status.optional",
    cached: "mock.status.cached",
    not_run: "mock.status.notRun",
    stale: "mock.status.stale",
    approval_required: "mock.status.approvalRequired",
    manual_required: "mock.status.manualRequired",
    not_applicable: "mock.status.notApplicable",
  };
  return t(mockLabels[state] || `state.${state}`, displayText(state));
}

function workflowStatusLabel(value, t) {
  const state = normalizeState(value);
  const labels = {
    ready: "workflow.status.ready",
    passed: "workflow.status.passed",
    failed: "workflow.status.failed",
    blocked: "workflow.status.needsConfirmation",
    unknown: "workflow.status.needsConfirmation",
    optional: "workflow.status.needsConfirmation",
    cached: "workflow.status.needsConfirmation",
    not_run: "workflow.status.notCollected",
    stale: "workflow.status.stale",
    missing: "workflow.status.notCollected",
    approval_required: "workflow.status.needsApproval",
    manual_required: "workflow.status.needsConfirmation",
    not_applicable: "workflow.status.notApplicable",
  };
  return t(labels[state] || `state.${state}`, displayText(state));
}

function productEvidenceStatusLabel(productAuthority, t) {
  const state = normalizeState(productAuthority?.status);
  if (state === "blocked" || state === "missing" || state === "not_run" || state === "unknown") {
    return t("workflow.status.evidenceMissing");
  }
  return workflowStatusLabel(state, t);
}

function productEvidenceDetail(productAuthority, t) {
  const summary = productAuthority?.manifest_summary || {};
  const ready = Number(summary.required_ready);
  const total = Number(summary.required_total);
  if (Number.isInteger(ready) && Number.isInteger(total) && total > 0) {
    return `${t("workflow.card.requiredDocs")}: ${ready} / ${total} ${t("workflow.card.readyUnit")}`;
  }
  const evidenceItems = asArray(productAuthority?.evidence_summary?.items);
  if (evidenceItems.length) {
    const collected = evidenceItems.filter((item) => ["ready", "passed"].includes(normalizeState(item.status))).length;
    return `${t("workflow.card.evidence")}: ${collected} / ${evidenceItems.length} ${t("workflow.card.collectedUnit")}`;
  }
  return t("workflow.card.productEvidenceDetail");
}

function productAuthorityCiGuidancePoints(productAuthority, t) {
  return asArray(productAuthority?.evidence_summary?.items)
    .filter((item) => displayText(item?.source_id, "").startsWith("product.ci."))
    .filter((item) => !["passed", "ready", "not_applicable"].includes(normalizeState(item?.status)))
    .map((item) => {
      const command = displayText(item?.next_command || item?.required_command, "");
      if (!command || command === "not_applicable") {
        return "";
      }
      const source = sourcePresentationKey(item.source_id, t);
      const status = statusLabelForChip(item.status, t);
      return `${t("workflow.ciEvidence.suggestedCheck")}: ${source} / ${status} / ${t("workflow.ciEvidence.displayOnly")}: ${command}`;
    })
    .filter(Boolean)
    .slice(0, 3);
}

function currentStepNumber(context) {
  const short = selectedStepShort(context);
  const match = displayText(short, "").match(/Step\s+(\d+)/i);
  return match ? match[1] : "";
}

function workflowStepDetailLabel(context, t) {
  if (!isLessonWorkflowContext(context)) {
    return t("summary.viewDetails");
  }
  const step = currentStepNumber(context);
  return step ? `${t("workflow.card.stepLabel")} ${step} ${t("workflow.card.stepDetailSuffix")}` : t("workflow.card.stepDetail");
}

function workflowRunTypeLabel(value, t) {
  const key = displayText(value, "");
  const map = {
    "Selected context": "workflow.run.selectedContext",
    "CI run": "workflow.run.ci",
    "Git sync": "workflow.run.gitSync",
    "Product evidence": "workflow.run.productEvidence",
    "Security gate": "workflow.run.securityGate",
    "Next step": "workflow.run.nextStep",
    "Repository observation": "workflow.run.repositoryObservation",
    "Repository index drift": "workflow.run.repositoryIndexDrift",
  };
  return map[key] ? t(map[key]) : displayText(value);
}

function workflowRunDetail(row, context, t) {
  const detail = displayText(row.detail, "");
  const map = {
    "Current snapshot CI evidence": "workflow.runDetail.ci",
    "Current snapshot Git synchronization evidence": "workflow.runDetail.gitSync",
    "Product authority and manifest evidence": "workflow.runDetail.productEvidence",
    "Product security gate snapshot": "workflow.runDetail.securityGate",
    "Selected context Git synchronization evidence": "workflow.runDetail.selectedGitSync",
    "Selected context CI evidence": "workflow.runDetail.selectedCi",
    "Selected context product authority evidence": "workflow.runDetail.selectedProductEvidence",
    "Selected context security gate snapshot": "workflow.runDetail.selectedSecurityGate",
    "Observed selected repository inventory and required paths.": "workflow.runDetail.repositoryObservation",
    "Compared worktree files with repository index.": "workflow.runDetail.repositoryIndexDrift",
  };
  if (detail === displayText(context.current_step_id, "")) {
    return currentStepDetailDisplay(context, t);
  }
  return map[detail] ? t(map[detail]) : detail;
}

function workflowRunReferenceLabel(value, t) {
  const key = displayText(value, "");
  const map = {
    "CI evidence": "workflow.reference.ci",
    "Git sync evidence": "workflow.reference.gitSync",
    "Product authority": "workflow.reference.productAuthority",
    "Security gate": "workflow.reference.securityGate",
    "Selected context": "workflow.reference.selectedContext",
    "Repository scope": "workflow.reference.repositoryScope",
    "Repository inventory": "workflow.reference.repositoryInventory",
  };
  return map[key] ? t(map[key]) : displayText(value, t("summary.viewDetails"));
}

function liveEvidenceCheckTitle(key, t) {
  const map = {
    local_tests: "overview.status.localTests",
    git_sync: "overview.status.git",
    ci: "overview.status.ci",
    security: "overview.status.security",
  };
  return t(map[key] || "detail.liveEvidence.title", displayKey(key));
}

function liveEvidenceRows(activeLiveStatus, keys, t) {
  if (!activeLiveStatus) {
    return [];
  }
  const rows = [];
  for (const key of keys) {
    const check = liveCheck(activeLiveStatus, key);
    if (!check) {
      continue;
    }
    const items = asArray(check.items).length ? asArray(check.items) : [check];
    items.forEach((item, index) => {
      const sourceId = displayText(item?.source_id || item?.current_item_id || check.source_id, "");
      const currentItemId = displayText(item?.current_item_id || check.current_item_id || sourceId, "");
      const status = item?.status || check.status || "unknown";
      const rawSummary = displayText(item?.summary || check.summary, "");
      const observedAt = liveStatusObservedTime(item?.observed_at || check.observed_at);
      const detailArtifactPath = displayText(item?.detail_artifact_path || check.detail_artifact_path, "");
      const command = displayText(item?.next_command || item?.required_command || check.required_command, "");
      rows.push({
        id: `${key}-${sourceId || index}-${index}`,
        key,
        sourceId,
        currentItemId,
        title: liveEvidenceCheckTitle(key, t),
        target: repositoryDisplayName(activeLiveStatus.target_repository?.name, t),
        branch: displayText(check.branch || activeLiveStatus.repository_state?.branch, ""),
        status,
        summary: rawSummary && sourceId && rawSummary === `${sourceId} ${normalizeState(status)}` ? `${sourcePresentationKey(sourceId, t)} ${statusLabelForChip(status, t)}` : (overviewLiveLocalizedText(rawSummary, t) || (sourceId ? sourcePresentationKey(sourceId, t) : liveEvidenceCheckTitle(key, t))),
        reason: overviewLiveLocalizedText(item?.reason || check.reason, t),
        action: overviewLiveLocalizedText(item?.next_action || check.next_action, t),
        observedAt,
        detailArtifactPath,
        command,
      });
    });
  }
  return rows;
}

function liveEvidenceRowInsight(row, t) {
  const sourceParts = [
    row.sourceId ? `${sourcePresentationKey(row.sourceId, t)}: ${row.sourceId}` : "",
    row.currentItemId && row.currentItemId !== row.sourceId ? row.currentItemId : "",
    row.detailArtifactPath,
    row.command && row.command !== "not_applicable" ? row.command : "",
    row.observedAt ? `${t("overview.fact.lastChecked")}: ${row.observedAt}` : "",
  ].filter(Boolean);
  return {
    title: row.title,
    eyebrow: t("detail.liveEvidence.title"),
    summary: row.summary,
    where: `${t("overview.fact.target")}: ${row.target}${row.branch ? ` / ${t("overview.fact.branch")}: ${row.branch}` : ""}`,
    why: row.reason,
    action: row.action,
    source: sourceParts.join(" / "),
    status: row.status,
    statusLabel: statusLabelForChip(row.status, t),
    points: sourceParts,
  };
}

function LiveEvidenceTable({ liveStatus, context, keys, title, headingId, t, tone = "workflow" }) {
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const rows = liveEvidenceRows(activeLiveStatus, keys, t);
  const id = headingId || `live-evidence-${keys.join("-")}`;
  return (
    <section className={`mock-table-section mock-table-section--${tone}`} aria-labelledby={id}>
      <h3 id={id}>{title || t("detail.liveEvidence.title")}</h3>
      <div className="mock-table">
        <div className={`mock-table__head mock-table__head--live-evidence mock-table__head--live-evidence-${tone}`}>
          <span>{t("workflow.table.type")}</span>
          <span>{t("workflow.table.target")}</span>
          <span>{t("workflow.table.detail")}</span>
          <span>{t("workflow.table.status")}</span>
          <span>{t("workflow.table.time")}</span>
          <span>{t("workflow.table.reference")}</span>
        </div>
        {rows.length ? rows.map((row) => (
          <article
            className={`mock-table-row mock-table-row--live-evidence mock-table-row--live-evidence-${tone}`}
            key={row.id}
            data-live-evidence-key={row.key}
            data-evidence-source-id={row.sourceId || undefined}
            data-evidence-current-item-id={row.currentItemId || undefined}
            data-evidence-detail-artifact-path={row.detailArtifactPath || undefined}
          >
            <strong data-label={t("workflow.table.type")}>{row.title}</strong>
            <span data-label={t("workflow.table.target")}>{row.target}{row.branch ? ` / ${row.branch}` : ""}</span>
            <p data-label={t("workflow.table.detail")}>{row.summary}</p>
            <span className="mock-table-row__status" data-label={t("workflow.table.status")}>
              <StatusPill value={row.status} t={t} label={statusLabelForChip(row.status, t)} />
            </span>
            <span data-label={t("workflow.table.time")}>{row.observedAt || t("workflow.table.snapshotEvidence")}</span>
            <span className="mock-table-row__reference" data-label={t("workflow.table.reference")}>
              <InsightDetailButton
                className="mock-table-link"
                detail={liveEvidenceRowInsight(row, t)}
                label={t("summary.viewDetails")}
                t={t}
                tone={tone === "safety" ? "safety" : tone === "maintenance" ? "maintenance" : "workflow"}
              />
            </span>
          </article>
        )) : (
          <article className={`mock-table-row mock-table-row--live-evidence mock-table-row--live-evidence-${tone}`}>
            <strong data-label={t("workflow.table.type")}>{t("summary.none")}</strong>
            <span data-label={t("workflow.table.target")}>{repositoryDisplayName(context.target_repository?.name, t)}</span>
            <p data-label={t("workflow.table.detail")}>{t("detail.liveEvidence.empty")}</p>
            <span className="mock-table-row__status" data-label={t("workflow.table.status")}>
              <StatusPill value="unknown" t={t} label={statusLabelForChip("unknown", t)} />
            </span>
            <span data-label={t("workflow.table.time")}>{t("workflow.table.snapshotEvidence")}</span>
            <span data-label={t("workflow.table.reference")}>{t("summary.none")}</span>
          </article>
        )}
      </div>
    </section>
  );
}

function workflowRunScopeLabel(row, context, t) {
  const scope = displayText(row.scope, "");
  if (!scope) {
    return workflowContextLabel(context.workflow_context, t);
  }
  if (scope === displayText(context.menu_id, "")) {
    return contextLabel(scope, t);
  }
  return workflowContextLabel(scope, t);
}

function workflowRunReferenceWhere(row, context, t) {
  const role = displayText(row.source_role, "workflow");
  const scope = workflowRunScopeLabel(row, context, t);
  const target = workflowRunTarget(row, context, t);
  const base = t(`workflow.runReferenceWhere.${role}`, t("workflow.runReference.where"));
  return `${base} ${t("workflow.runReference.scope")}: ${scope}. ${t("workflow.runReference.target")}: ${target}.`;
}

function workflowDecisionValueLines(context, t) {
  const workflowText = t("detail.workflow.checks");
  if (workflowText === "開発を進めてよい Git/CI 状態かを判断します。") {
    return ["開発を進めてよい", "Git/CI 状態かを判断します。"];
  }
  if (workflowText === "Whether Git/CI is ready to continue") {
    return ["Whether Git/CI is ready", "to continue"];
  }
  return [workflowText || workflowContextLabel(context.workflow_context, t)];
}

function workflowMustReviewPoints(t) {
  return [
    t("detail.workflow.mustReview.gitSync"),
    t("detail.workflow.mustReview.ci"),
    t("detail.workflow.mustReview.prMerge"),
    t("detail.workflow.mustReview.evidence"),
  ];
}

function maintenanceStatusLabel(id, status, t) {
  const state = normalizeState(status);
  if (state === "unknown" || state === "manual_required" || state === "optional" || state === "cached") {
    return t("maintenance.status.unconfirmed");
  }
  if (state === "blocked" || state === "missing" || state === "not_run") {
    return t("maintenance.status.notCollected");
  }
  if (state === "failed" || state === "stale") {
    return statusLabelForChip(status, t);
  }
  const labels = {
    as_built_sync_status: "maintenance.status.synced",
    workflow_pair_status: "maintenance.status.synced",
    developer_memory_status: "maintenance.status.recorded",
    skills_status: "maintenance.status.normal",
    git_workflow_settings: "maintenance.status.enabled",
    security_policy: "maintenance.status.compliant",
    dashboard_data_schema: "maintenance.status.normal",
  };
  return t(labels[id] || "maintenance.status.ready", statusLabelForChip(status, t));
}

function maintenanceCardCopy(id, t) {
  const map = {
    as_built_sync_status: "maintenance.card.asBuilt",
    workflow_pair_status: "maintenance.card.workflowPair",
    developer_memory_status: "maintenance.card.developerMemory",
    skills_status: "maintenance.card.skills",
    git_workflow_settings: "maintenance.card.gitWorkflowSettings",
    security_policy: "maintenance.card.securityPolicy",
  };
  return t(map[id] || "maintenance.note.default");
}

function maintenanceEvidenceLabel(row, t) {
  const id = displayText(row?.id, "");
  return t(`maintenance.evidenceLabel.${id}`, displayText(row?.label));
}

function maintenanceReferenceValues(row) {
  const rawReference = [displayText(row?.reference, ""), displayText(row?.source_artifacts, "")]
    .filter(Boolean)
    .join(";");
  if (!rawReference) {
    return [];
  }
  return Array.from(new Set(rawReference
    .split(";")
    .map((reference) => reference.trim())
    .filter(Boolean)));
}

function maintenanceObservedAt(row) {
  return formatDashboardDateTime(row?.observed_at) || "";
}

function maintenanceUnresolvedCount(row) {
  const value = Number.parseInt(displayText(row?.unresolved_count, "0"), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function maintenanceUnresolvedLabel(count, t) {
  return `${count}${t("maintenance.unresolvedUnit")}`;
}

function maintenancePriorityLabel(row, t) {
  const priority = displayText(row?.priority, "medium").toLowerCase();
  return t(`maintenance.priority.${priority}`, displayKey(priority));
}

function maintenanceEvidenceImpact(row, t) {
  const id = displayText(row?.id, "");
  return t(`maintenance.evidenceImpact.${id}`, displayText(row?.impact, t("maintenance.evidenceImpact.default")));
}

function maintenanceEvidenceCompletion(row, t) {
  const id = displayText(row?.id, "");
  return t(`maintenance.evidenceCompletion.${id}`, displayText(row?.completion_condition, t("maintenance.evidenceCompletion.default")));
}

function maintenanceReviewPoints(t) {
  return [
    t("maintenance.review.asBuilt"),
    t("maintenance.review.workflowPair"),
    t("maintenance.review.developerMemory"),
    t("maintenance.review.evidence"),
  ];
}

function stateDetail(value, t) {
  return `${t("field.status", "Status")}: ${statusLabelForChip(value, t)}`;
}

function repositoryPathStateToStatus(value) {
  const state = displayText(value, "unknown");
  if (state === "configured") {
    return "ready";
  }
  if (state === "not_applicable") {
    return "not_applicable";
  }
  if (state === "missing") {
    return "missing";
  }
  return "unknown";
}

function selectedLessonObject(data, context) {
  const menuId = displayText(context.menu_id, "");
  if (menuId === "step_1_7") {
    return data.lessons?.step_1_7 || {};
  }
  if (menuId === "advanced") {
    return data.lessons?.advanced || {};
  }
  return data.lessons?.step_1_14 || {};
}

function aggregateLessonSettingsStatus(lesson) {
  const states = ["learning_mode_status", "workflow_language_status", "product_language_status"].map((field) => normalizeState(lesson?.[field]));
  if (states.some((state) => state === "missing" || state === "failed" || state === "blocked")) {
    return states.find((state) => state === "failed" || state === "blocked") || "missing";
  }
  if (states.some((state) => state === "unknown")) {
    return "unknown";
  }
  return states.every((state) => state === "ready" || state === "passed") ? "ready" : "manual_required";
}

function lessonSettingsDetail(lesson, t) {
  if (aggregateLessonSettingsStatus(lesson) === "ready") {
    return t("lesson.live.settingsDetail");
  }
  return [
    `${t("field.learningMode")}: ${statusLabelForChip(lesson?.learning_mode_status, t)}`,
    `${t("field.workflowLanguage")}: ${statusLabelForChip(lesson?.workflow_language_status, t)}`,
    `${t("field.productLanguage")}: ${statusLabelForChip(lesson?.product_language_status, t)}`,
  ].join(" / ");
}

function dashboardReflectionStatus(data) {
  return displayText(data.snapshot_id, "") && displayText(data.content_hash, "") ? "passed" : "unknown";
}

function dashboardReflectionDetail(data, t) {
  const identity = displayText(data.snapshot_id || data.content_hash, "");
  return identity ? t("lesson.live.dashboardDisplayDetail") : stateDetail("unknown", t);
}

function gitCiLiveStatus(context, t) {
  const gitState = normalizeState(context.git_status);
  const ciState = normalizeState(context.ci_status);
  if (gitState === "manual_required" && ciState === "manual_required") {
    return {
      status: t("lesson.live.gitCiNeedsReview"),
      detail: t("lesson.live.gitCiNeedsReviewDetail"),
    };
  }
  if (gitState === ciState) {
    return {
      status: statusLabelForChip(gitState, t),
      detail: t("lesson.live.gitCiDetail"),
    };
  }
  return {
    status: `${t("lesson.live.gitLabel")}: ${statusLabelForChip(gitState, t)} / ${t("lesson.live.ciLabel")}: ${statusLabelForChip(ciState, t)}`,
    detail: t("lesson.live.gitCiDetail"),
  };
}

function securityGateDetail(security, failures, t) {
  const firstFailure = failures[0];
  if (firstFailure?.reason) {
    return localizedSecurityDetail(firstFailure.reason, t);
  }
  const state = normalizeState(security?.gate_status);
  if (isReviewState(state)) {
    return stateDetail(state, t);
  }
  return t("security.card.gateReady");
}

function localizedSecurityDetail(detail, t) {
  const text = displayText(detail, "");
  const detailKeys = {
    "Required product evidence has not run.": "security.detail.requiredEvidenceNotRun",
    "Dangerous operations require explicit approval before execution.": "security.detail.dangerousApprovalRequired",
    "Push, PR, and merge approval states are tracked separately.": "security.detail.gitWorkflowApprovalTracked",
    "Merge is gated and must stay outside the dashboard UI.": "security.detail.mergeGated",
    "Cleanup is preview-only until an explicit external approval path is used.": "security.detail.cleanupApprovalRequired",
  };
  return detailKeys[text] ? t(detailKeys[text]) : text;
}

function securityApprovalDetail(approval, fallbackState, t) {
  const id = displayText(approval?.id, "");
  const idKeys = {
    dangerous_action_approval: "security.detail.dangerousApprovalRequired",
    git_workflow_approval: "security.detail.gitWorkflowApprovalTracked",
  };
  if (idKeys[id]) {
    return t(idKeys[id]);
  }
  if (approval?.detail) {
    return localizedSecurityDetail(approval.detail, t);
  }
  return stateDetail(fallbackState, t);
}

function securityDangerousOperationDetail(operation, t) {
  const id = displayText(operation?.id, "");
  const idKeys = {
    merge: "security.detail.mergeGated",
    cleanup: "security.detail.cleanupApprovalRequired",
  };
  if (idKeys[id]) {
    return t(idKeys[id]);
  }
  if (operation?.detail) {
    return localizedSecurityDetail(operation.detail, t);
  }
  return t("security.card.dangerousNone");
}

function securityPartialDetail(failures, t) {
  if (failures.length) {
    return localizedSecurityDetail(failures[0].reason, t);
  }
  return t("security.card.partialNone");
}

function securityReviewCount(security, partialFailures) {
  const rows = [
    { status: security?.gate_status },
    { status: security?.dangerous_action_approval },
    ...asArray(security?.approvals),
    ...asArray(security?.dangerous_operations),
    ...asArray(partialFailures),
  ];
  return rows.filter((row) => hasReviewState(row?.status)).length;
}

function securityHasHardBlock(security, partialFailures) {
  return [
    security?.gate_status,
    ...asArray(partialFailures).map((failure) => failure.status),
  ].some((status) => ["blocked", "failed"].includes(normalizeState(status)));
}

function maintenanceEvidenceRow(maintenance, ids) {
  const idSet = new Set(ids);
  return asArray(maintenance?.evidence_rows).find((row) => idSet.has(displayText(row.id, ""))) || null;
}

function maintenanceCardDetail(maintenance, ids, status, t) {
  const row = maintenanceEvidenceRow(maintenance, ids);
  if (row) {
    const why = maintenanceEvidenceWhy(row.id, t);
    const reference = displayText(row.reference, "");
    return reference ? `${why} ${t("maintenance.reference")}: ${reference}` : why;
  }
  return stateDetail(status, t);
}

function MetricRing({ metric }) {
  const percent = clampPercent(metric?.percent);
  return (
    <div className="metric-ring" style={{ "--metric-percent": `${percent}%` }} aria-label={`${percent}%`}>
      <span>{percent}%</span>
    </div>
  );
}

function MetricRows({ metric, t }) {
  const rows = [
    { label: t("summary.total"), value: metric?.total ?? 0 },
    { label: t("summary.healthy"), value: metric?.healthy ?? 0 },
    { label: t("summary.warning"), value: metric?.warning ?? 0 },
    { label: t("summary.problem"), value: metric?.problem ?? 0 },
  ];
  return (
    <dl className="metric-rows">
      {rows.map((row) => (
        <div className="metric-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActionMetaRow({ Icon, label, children }) {
  return (
    <div className="action-meta-row">
      <Icon aria-hidden="true" size={17} />
      <div>
        <span>{label}</span>
        <strong>{children}</strong>
      </div>
    </div>
  );
}

function DetailPageHeader({ tone, Icon, title, subtitle, data, locale, t, actionLabel, headingId }) {
  const generated = formatGenerated(data, locale);
  return (
    <div className={`detail-page-header detail-page-header--${tone}`}>
      <div className="detail-page-header__title">
        <span className="detail-page-header__icon">
          <Icon aria-hidden="true" size={34} />
        </span>
        <div>
          <h2 id={headingId}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="detail-page-header__meta">
        {generated ? (
          <span>
            <Clock aria-hidden="true" size={15} />
            {t("app.lastUpdated")}: {generated}
          </span>
        ) : null}
        <span>
          <Lock aria-hidden="true" size={15} />
          {t("app.snapshot")} / {t("app.readOnly")}
        </span>
        {actionLabel ? (
          <button className="detail-page-header__action" type="button" onClick={requestDashboardSnapshotRefresh}>
            <RefreshCw aria-hidden="true" size={15} />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function lessonSummaryLines(text) {
  const value = displayText(text, "");
  if (!value) {
    return [];
  }
  if (value.includes("、")) {
    const [first, ...rest] = value.split("、");
    return [`${first}、`, rest.join("、")].filter(Boolean);
  }
  if (value.includes(" Git/CI ")) {
    return value.replace(" Git/CI ", "\nGit/CI ").split("\n");
  }
  if (value.includes(" and what ")) {
    return value.replace(" and what ", "\nand what ").split("\n");
  }
  return [value];
}

function SummaryBullets({ items }) {
  const visibleItems = asArray(items).filter((item) => displayText(item, ""));
  if (!visibleItems.length) {
    return null;
  }
  return (
    <ul className="summary-bullets">
      {visibleItems.map((item, index) => (
        <li key={`${displayText(item)}-${index}`}>{displayText(item)}</li>
      ))}
    </ul>
  );
}

function DetailSection({ id, title, Icon, children, className = "" }) {
  const headingId = `${id}-heading`;
  return (
    <section className={`detail-section ${className}`} id={id} aria-labelledby={headingId}>
      <div className="detail-section__head">
        <Icon aria-hidden="true" size={20} />
        <h3 id={headingId}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DetailStatusCard({ id, title, technicalKey, value, t, Icon = CircleDashed, tone = "default", note, footer, visualState }) {
  const statusValue = value && typeof value === "object" ? value.status : value;
  const state = normalizeState(visualState || statusValue);
  const details = value && typeof value === "object" ? value : { status: value };
  const detailFields = objectEntries(details)
    .filter(([key]) => key !== "status")
    .map(([key, fieldValue]) => ({ label: displayKey(key), value: fieldValue }));
  return (
    <article className={`item-card detail-card detail-card--${tone} detail-card--${state}`} data-detail-card={id}>
      <div className="detail-card__head">
        <span className="detail-card__icon">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div>
          <h3>{title}</h3>
          {technicalKey ? <span className="detail-card__technical">{technicalKey}</span> : null}
        </div>
        <StatusPill value={statusValue} t={t} />
      </div>
      {note ? <p className="detail-card__note">{note}</p> : null}
      <FieldGrid fields={detailFields} />
      {footer ? <div className="detail-card__footer">{footer}</div> : null}
    </article>
  );
}

function DetailTableRow({ item, t, tone = "workflow", showChevron = true }) {
  const Icon = item.Icon || CircleDashed;
  return (
    <article className={`detail-row detail-row--${tone} detail-row--${normalizeState(item.state)}`} data-detail-row={item.id}>
      <div className="detail-row__identity">
        <span className="detail-row__icon">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div>
          <h3>{item.title}</h3>
          {item.technicalKey ? <span>{item.technicalKey}</span> : null}
        </div>
      </div>
      <p className="detail-row__note">{item.note}</p>
      <div className="detail-row__status">
        <StatusPill value={item.state} t={t} />
        {item.summary ? <span>{item.summary}</span> : null}
      </div>
      <div className="detail-row__meta">
        {item.updated ? <span>{item.updated}</span> : null}
        {showChevron ? <ChevronRight aria-hidden="true" size={18} /> : null}
      </div>
    </article>
  );
}

function EmptyDetailRow({ title, detail, t, tone = "workflow" }) {
  return (
    <article className={`detail-row detail-row--${tone} detail-row--empty`}>
      <div className="detail-row__identity">
        <span className="detail-row__icon">
          <CheckCircle2 aria-hidden="true" size={22} />
        </span>
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      <p className="detail-row__note">{detail}</p>
      <div className="detail-row__status">
        <StatusPill value="ready" t={t} />
      </div>
      <div className="detail-row__meta" />
    </article>
  );
}

function PrimaryActionCard({ action, t }) {
  if (!action || typeof action !== "object") {
    return null;
  }
  return (
    <article className="next-action-panel">
      <div className="next-action-panel__head">
        <CheckCircle2 aria-hidden="true" size={24} />
        <div>
          <span className="eyebrow">{t("summary.nextSafeAction")}</span>
          <p>{displayText(action.description)}</p>
        </div>
      </div>
      <div className="primary-action-card">
        <div className="primary-action-card__head">
          <FileCheck2 aria-hidden="true" size={24} />
          <div>
            <h3>{displayText(action.title)}</h3>
          </div>
          <StatusPill value={action.status} t={t} />
        </div>
      </div>
      <div className="action-meta">
        <ActionMetaRow Icon={User} label={t("field.target")}>
          {displayText(action.target)}
        </ActionMetaRow>
        <ActionMetaRow Icon={Target} label={t("field.expectedResult")}>
          {displayText(action.expected_result)}
        </ActionMetaRow>
        <ActionMetaRow Icon={ShieldCheck} label={t("field.risk")}>
          <RiskPill value={action.risk_level} t={t} />
        </ActionMetaRow>
      </div>
    </article>
  );
}

function IssueSummaryCard({ title, items, t, Icon, href, always = false }) {
  if (!items.length && !always) {
    return null;
  }
  const previewItem = items[0];
  return (
    <article className={items.length ? "issue-summary" : "issue-summary issue-summary--empty"}>
      <div className="issue-preview__head">
        <div>
          <Icon aria-hidden="true" size={20} />
          <h3>{title}</h3>
        </div>
        <span>{items.length}</span>
      </div>
      {previewItem ? (
        <div className="issue-preview__list">
          <article className="issue issue--compact">
            <div className="issue__title">
              <span>{sourceLabel(previewItem.source, t)}</span>
              <StatusPill value={previewItem.status} t={t} />
            </div>
            <p>{displayText(previewItem.reason)}</p>
          </article>
        </div>
      ) : (
        <p className="issue-summary__empty">{t("summary.none")}</p>
      )}
      {items.length > 1 ? <p className="issue-summary__more">{items.length - 1} {t("summary.moreItems")}</p> : null}
      {href ? (
        <a className="card-link" href={href}>
          {t("summary.viewDetails")}
        </a>
      ) : null}
    </article>
  );
}

function FieldGrid({ fields }) {
  const visibleFields = fields.filter((field) => field.value !== undefined && field.value !== null && field.value !== "");
  if (visibleFields.length === 0) {
    return null;
  }
  return (
    <dl className="field-grid">
      {visibleFields.map((field) => (
        <div className="field" key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.render ? field.render(field.value) : displayText(field.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CompactList({ title, items }) {
  if (!items.length) {
    return null;
  }
  return (
    <div className="compact-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{displayText(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function IssueList({ title, items, t, Icon = AlertTriangle }) {
  if (!items.length) {
    return null;
  }
  return (
    <div className="issue-list">
      <div className="issue-list__head">
        <Icon aria-hidden="true" size={20} />
        <h3>{title}</h3>
      </div>
      {items.map((item, index) => (
        <article className={`issue issue--${normalizeState(item.status)}`} key={`${displayText(item.source)}-${index}`}>
          <div className="issue__title">
            <Icon aria-hidden="true" size={17} />
            <span>{sourceLabel(item.source, t)}</span>
            <StatusPill value={item.status} t={t} />
          </div>
          <p>{displayText(item.reason)}</p>
          {item.required_command ? <code className="reference-code">{displayText(item.required_command)}</code> : null}
        </article>
      ))}
    </div>
  );
}

function GuidanceList({ items, t }) {
  if (!items.length) {
    return null;
  }
  return (
    <div className="guidance-list" aria-label={t("aria.guidance")}>
      {items.map((item, index) => (
        <article className={`guidance guidance--${displayText(item.priority, "info")}`} key={`${item.surface}-${item.audience}-${index}`}>
          <div className="guidance__meta">
            <span>{displayText(item.surface)}</span>
            <span>{displayText(item.audience)}</span>
            <span>{displayText(item.priority)}</span>
          </div>
          <p>{displayText(item.message)}</p>
        </article>
      ))}
    </div>
  );
}

function StatusStrip({ data, t, locale }) {
  const blockers = asArray(data.summary?.blocking_items).length;
  const generated = data.generated_at ? formatDateTime(data.generated_at, locale) : "";
  const age = data.generated_at ? formatRelativeAge(data.generated_at, locale) : "";
  const items = [
    { label: t("summary.mode"), value: displayText(data.summary?.mode), Icon: Brain },
    { label: t("summary.generated"), value: generated, detail: age, Icon: CalendarDays },
    { label: t("summary.state"), value: t("app.readOnly"), detail: t("app.snapshot"), Icon: Lock },
    { label: t("summary.blockers"), value: blockers ? String(blockers) : t("summary.noBlockers"), Icon: AlertTriangle },
  ];
  return (
    <div className="status-strip" aria-label={t("aria.snapshotStatus")}>
      {items.map(({ label, value, detail, Icon }) => (
        <div className="status-strip__item" key={label}>
          <Icon aria-hidden="true" size={20} />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
            {detail ? <small>{detail}</small> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthCard({ id, title, status, detail, href, t, Icon, metric }) {
  const state = normalizeState(metric?.status || status);
  return (
    <article className={`health-card health-card--${state} health-card--${id}`} data-health-card={title}>
      <div className="health-card__head">
        <Icon aria-hidden="true" size={20} />
        <h3>{title}</h3>
        <StatusPill value={metric?.status || status} t={t} />
      </div>
      <div className="health-card__body">
        <MetricRing metric={metric} />
        <div>
          <p>{detail}</p>
          <MetricRows metric={metric} t={t} />
        </div>
      </div>
      <a className="card-link" href={href}>
        {t("summary.openCategory")}
      </a>
    </article>
  );
}

function buildCategorySummaries({ summary, t }) {
  const metrics = summary.category_metrics;
  return [
    {
      id: "overview",
      title: t("nav.overview"),
      status: metrics.overview.status,
      detail: t("summary.overviewDetail"),
      meta: t("summary.currentPage"),
      metric: metrics.overview,
      Icon: Home,
    },
    {
      id: "lessons",
      title: t("nav.lessons"),
      status: metrics.lessons.status,
      detail: `${metrics.lessons.total} ${t("summary.lessonsCount")}`,
      meta: `${metrics.lessons.total} ${t("summary.items")}`,
      metric: metrics.lessons,
      Icon: BookOpen,
    },
    {
      id: "workflow",
      title: t("nav.workflow"),
      status: metrics.workflow.status,
      detail: `${metrics.workflow.total} ${t("summary.workflowFields")}`,
      meta: `${metrics.workflow.total} ${t("summary.steps")}`,
      metric: metrics.workflow,
      Icon: WorkflowCategoryIcon,
    },
    {
      id: "maintenance",
      title: t("nav.maintenance"),
      status: metrics.maintenance.status,
      detail: `${metrics.maintenance.total} ${t("summary.maintenanceFields")}`,
      meta: `${metrics.maintenance.total} ${t("summary.items")}`,
      metric: metrics.maintenance,
      Icon: Wrench,
    },
    {
      id: "safety",
      title: t("nav.safety"),
      status: metrics.security.status,
      detail: `${metrics.security.total} ${t("summary.securityFields")}`,
      meta: `${metrics.security.total} ${t("summary.checks")}`,
      metric: metrics.security,
      Icon: ShieldCheck,
    },
  ];
}

function ExplorePages({ categories, t }) {
  return (
    <section className="explore-pages" aria-labelledby="explore-pages-heading">
      <h3 id="explore-pages-heading">{t("summary.explorePages")} <span>{t("summary.explorePagesSuffix")}</span></h3>
      <div className="explore-grid">
        {categories.map(({ id, title, Icon }) => (
          <a className={id === "overview" ? `explore-card explore-card--${id} is-current` : `explore-card explore-card--${id}`} href={`#${id}`} key={id}>
            <div className="explore-card__head">
              <span className="explore-card__icon">
                <Icon aria-hidden="true" size={28} />
              </span>
              <span className="explore-card__title">{title}</span>
            </div>
            <p>{t(`summary.explore.${id}`)}</p>
            <span className="explore-card__open">{t("summary.openCategory")} <ArrowRightCircle aria-hidden="true" size={15} /></span>
          </a>
        ))}
      </div>
    </section>
  );
}

function RepositoryNotice({ t }) {
  return (
    <div className="repository-notice">
      <Info aria-hidden="true" size={16} />
      <span>{t("summary.repositoryNotice")}</span>
    </div>
  );
}

function OverviewSection({ data, t, locale, activeMenuId, pendingMenuId, onActiveMenuChange, liveStatus }) {
  const summary = data.summary || {};
  const partialFailures = asArray(data.partial_failures);
  const categorySummaries = buildCategorySummaries({
    summary,
    t,
  });
  const exploreSummaries = categorySummaries.filter((category) => category.id !== "overview");
  const metrics = summary.category_metrics || {};
  const context = selectedContextData(data);
  const currentStep =
    Number.isInteger(context.current_step_index) && Number.isInteger(context.current_step_total) && context.current_step_total > 0
      ? `${context.current_step_index} / ${context.current_step_total}`
      : displayText(context.current_step_label || context.current_step_id);
  const lessonMetric = metrics.lessons || {};
  const primaryStatusCard = overviewPrimaryStatusCard(data, context, lessonMetric, t, liveStatus);
  const gitStatusCard = overviewGitCard(data, context, t, liveStatus);
  const ciStatusCard = overviewCiCard(data, context, t, liveStatus);
  const securityStatusCard = overviewSecurityCard(data, context, t, liveStatus);
  const selectedMenuId = displayText(activeMenuId || context.menu_id, context.menu_id);
  const repositorySelection = repositorySelectionForMenu(data, selectedMenuId);

  return (
    <section className="view-surface" id="overview" aria-labelledby="overview-heading">
      <PageTitleHeader viewId="overview" Icon={Home} title={t("nav.overview")} subtitle={t("overview.subtitle")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="overview-heading" />
      <MenuTileStrip data={data} t={t} activeMenuId={activeMenuId} pendingMenuId={pendingMenuId} onActiveMenuChange={onActiveMenuChange} />
      <ContextSnapshotStrip data={data} t={t} locale={locale} />
      <ProducerDecisionSummary data={data} pageId="overview" tone="sidebar" t={t} />
      <OperationalSituationBoard data={data} context={context} liveStatus={liveStatus} t={t} />
      <RepositorySelectionPanel selection={repositorySelection} t={t} />
      <section className="overview-status-grid" aria-label={t("overview.currentStatus")}>
        <OverviewStatusCard
          id={primaryStatusCard.id}
          title={primaryStatusCard.title}
          status={primaryStatusCard.status}
          metric={primaryStatusCard.metric}
          value={primaryStatusCard.value}
          detail={primaryStatusCard.detail}
          chipLabel={primaryStatusCard.chipLabel}
          detailInfo={primaryStatusCard.detailInfo}
          detailHref={primaryStatusCard.detailHref}
          t={t}
        />
        <OverviewStatusCard {...gitStatusCard} t={t} />
        <OverviewStatusCard {...ciStatusCard} t={t} />
        <OverviewStatusCard {...securityStatusCard} t={t} />
      </section>
      <CommonStatusPanel data={data} partialFailures={partialFailures} t={t} />
      <ExplorePages categories={exploreSummaries} t={t} />
      <RepositoryNotice t={t} />
    </section>
  );
}

function lessonAttentionCount(lesson) {
  const statusFields = [
    lesson.status,
    lesson.learning_mode_status,
    lesson.workflow_language_status,
    lesson.product_language_status,
    lesson.learner_approval_status,
  ];
  const statusCount = statusFields.filter((value) => value !== undefined && value !== null && value !== "" && isReviewState(value)).length;
  const warningsKey = pickFirst(lesson, ["warnings", "lesson_warnings"]);
  return statusCount + (warningsKey ? asArray(lesson[warningsKey]).length : 0);
}

function firstLessonNextAction(lessonEntries) {
  for (const [, lesson] of lessonEntries) {
    const nextKey = pickFirst(lesson, ["next_learning_action", "next_safe_action", "next_action"]);
    if (nextKey && displayText(lesson[nextKey], "")) {
      return displayText(lesson[nextKey]);
    }
  }
  return "";
}

function workflowItemMeta(id, t) {
  const map = {
    "development.product_repository": { title: t("workflow.item.productRepository"), Icon: Database, note: t("workflow.note.productRepository") },
    "development.product_authority": { title: t("workflow.item.productAuthority"), Icon: FileSearch, note: t("workflow.note.productAuthority") },
    "development.documents": { title: t("workflow.item.documents"), Icon: FileText, note: t("workflow.note.documents") },
    "development.git_sync_status": { title: t("workflow.item.gitSync"), Icon: RefreshCw, note: t("workflow.note.gitSync") },
    "development.ci_status": { title: t("workflow.item.ci"), Icon: CheckCircle2, note: t("workflow.note.ci") },
    "git_workflow.policy_status": { title: t("workflow.item.policy"), Icon: ShieldCheck, note: t("workflow.note.policy") },
    "git_workflow.settings_status": { title: t("workflow.item.settings"), Icon: Settings, note: t("workflow.note.settings") },
    "git_workflow.gate_status": { title: t("workflow.item.gate"), Icon: Lock, note: t("workflow.note.gate") },
    "git_workflow.approval_status": { title: t("workflow.item.approval"), Icon: ShieldAlert, note: t("workflow.note.approval") },
  };
  return map[id] || { title: displayKey(id), Icon: WorkflowCategoryIcon, note: t("workflow.note.default") };
}

function collectWorkflowItems({ development, gitWorkflow, t }) {
  return [
    ...objectEntries(development)
      .filter(([id]) => !["git_operations", "recent_runs"].includes(id))
      .map(([id, value]) => [`development.${id}`, value]),
    ...objectEntries(gitWorkflow).map(([id, value]) => [`git_workflow.${id}`, value]),
  ]
    .map(([id, value]) => {
      const meta = workflowItemMeta(id, t);
      return {
        id,
        value,
        state: valueState(value),
        technicalKey: presentationKeyFromId(id),
        summary: workflowItemSummary(id, value, t),
        ...meta,
      };
    })
    .sort(compareByStatePriority);
}

function workflowItemSummary(id, value, t) {
  if (id === "development.product_authority" && value && typeof value === "object") {
    const blockers = asArray(value.product_operation_blockers).length;
    if (blockers) {
      return `${blockers} ${t("workflow.summary.productBlockers")}`;
    }
    return stateLabel(valueState(value), t);
  }
  if (value && typeof value === "object" && value.configured_name) {
    return displayText(value.configured_name);
  }
  if (id === "development.documents") {
    return t("detail.workflow.requiredDocsReady");
  }
  return stateLabel(valueState(value), t);
}

function maintenanceItemMeta(id, t) {
  const map = {
    as_built_sync_status: { title: t("maintenance.item.asBuilt"), note: t("maintenance.note.asBuilt"), Icon: RefreshCw },
    workflow_pair_status: { title: t("maintenance.item.workflowPair"), note: t("maintenance.note.workflowPair"), Icon: Waypoints },
    developer_memory_status: { title: t("maintenance.item.developerMemory"), note: t("maintenance.note.developerMemory"), Icon: Brain },
    skills_status: { title: t("maintenance.item.skills"), note: t("maintenance.note.skills"), Icon: BookMarked },
  };
  return map[id] || { title: displayKey(id), note: t("maintenance.note.default"), Icon: RefreshCw };
}

function safetyItemMeta(id, t) {
  const map = {
    policy_status: { title: t("security.item.policy"), note: t("security.note.policy"), Icon: ShieldCheck },
    gate_status: { title: t("security.item.gate"), note: t("security.note.gate"), Icon: Flag },
    dangerous_action_approval: { title: t("security.item.approval"), note: t("security.note.approval"), Icon: UserCheck },
  };
  return map[id] || { title: displayKey(id), note: t("security.note.default"), Icon: ShieldCheck };
}

function statusToneFromReview(count, fallback) {
  return count > 0 ? "approval_required" : normalizeState(fallback);
}

function hasReviewState(value) {
  return value !== undefined && value !== null && value !== "" && isReviewState(value);
}

function lessonPrimaryAttentionText(lesson, t) {
  if (hasReviewState(lesson.learning_mode_status)) {
    return t("detail.lesson.learningModeMissing");
  }
  if (hasReviewState(lesson.workflow_language_status)) {
    return t("detail.lesson.workflowLanguageMissing");
  }
  if (hasReviewState(lesson.product_language_status)) {
    return t("detail.lesson.productLanguageMissing");
  }
  if (hasReviewState(lesson.learner_approval_status)) {
    return t("detail.lesson.learnerApprovalRequired");
  }
  if (hasReviewState(lesson.status)) {
    return t("detail.lesson.stateMissing");
  }
  return t("detail.lesson.warningCallout");
}

function lessonAttentionDetailText(lesson, t) {
  if (hasReviewState(lesson.learner_approval_status)) {
    return t("detail.lesson.reviewApproval");
  }
  return t("detail.lesson.reviewSettings");
}

function lessonReviewPoints(lessonEntries, t) {
  const points = [];
  for (const [id, lesson] of lessonEntries) {
    const title = displayText(lesson?.label, displayKey(id));
    const missing = [
      lesson?.learning_mode_status,
      lesson?.workflow_language_status,
      lesson?.product_language_status,
      lesson?.status,
    ].filter((value) => value !== undefined && value !== null && value !== "" && isReviewState(value)).length;
    const warningsKey = pickFirst(lesson || {}, ["warnings", "lesson_warnings"]);
    const warningCount = warningsKey ? asArray(lesson[warningsKey]).length : 0;
    if (missing) {
      points.push(`${title}: ${t("detail.lesson.missingSettings")}`);
    }
    if (warningCount) {
      points.push(`${title}: ${warningCount} ${t("detail.lesson.warningsUnit")}`);
    }
  }
  return points.length ? points.slice(0, 4) : [t("summary.none")];
}

function itemTitles(items, fallback, limit = 4) {
  const titles = items.map((item) => displayText(item.title, "")).filter(Boolean);
  return titles.length ? titles.slice(0, limit) : [fallback];
}

function sourceStatusSummary(value, t) {
  const details = value && typeof value === "object" ? value : { status: value };
  const nonStatus = objectEntries(details).filter(([key, fieldValue]) => key !== "status" && displayText(fieldValue, ""));
  if (nonStatus.length) {
    return nonStatus
      .slice(0, 2)
      .map(([key, fieldValue]) => `${displayKey(key)}: ${displayText(fieldValue)}`)
      .join(" / ");
  }
  return stateLabel(valueState(value), t);
}

function statusSummaryBadge(count, label, t) {
  return count ? `${label}: ${count}` : t("summary.none");
}

function countWithUnit(count, unitKey, t) {
  return `${count} ${t(unitKey)}`;
}

function CommandChip({ command }) {
  const text = displayText(command, "");
  if (!text) {
    return null;
  }
  return (
    <code className="command-chip">
      <span>{text}</span>
      <Copy aria-hidden="true" size={15} />
    </code>
  );
}

function CommandPreviewCommand({ command, t }) {
  const text = displayText(command, "");
  if (!text) {
    return null;
  }
  return (
    <span className="command-preview__command-chip">
      <span className="technical-tooltip-value command-preview__command-value" data-tooltip={t("security.commandPreviewTooltip")}>
        <code className="command-chip command-chip--preview">
          <span>{text}</span>
        </code>
      </span>
      <button className="command-preview__command-copy" type="button" aria-label={`${t("app.copyItem")}: ${text}`} data-copy-tooltip={text} onClick={() => copyTextToClipboard(text)}>
        <Copy aria-hidden="true" size={14} />
      </button>
    </span>
  );
}

function ReadOnlyBanner({ t, tone = "default" }) {
  return (
    <div className={`read-only-banner read-only-banner--${tone}`}>
      <Info aria-hidden="true" size={18} />
      <span>{t("detail.readOnlyBanner")}</span>
    </div>
  );
}

function MockNotice({ tone = "info", Icon = Info, title, detail, cta }) {
  return (
    <div className={`mock-notice mock-notice--${tone}`}>
      <Icon aria-hidden="true" size={20} />
      <div>
        <strong>{title}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
      {cta ? (
        <a className="mock-notice__button" href={cta.href || "#overview"}>
          {cta.label}
          <ArrowRightCircle aria-hidden="true" size={15} />
        </a>
      ) : null}
    </div>
  );
}

function LessonHealthNotice({ t }) {
  return (
    <div className="mock-notice mock-notice--lessons-warning lesson-health-notice">
      <AlertTriangle aria-hidden="true" size={18} />
      <div>
        <strong>{t("lesson.healthWarning")}</strong>
      </div>
      <a className="mock-notice__button lesson-health-notice__button" href="#maintenance">
        {t("lesson.healthWarningCta")}
        <ChevronRight aria-hidden="true" size={16} />
      </a>
    </div>
  );
}

function LessonRow({ Icon, label, children, state }) {
  return (
    <div className="lesson-row">
      <span className="lesson-row__icon">
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="lesson-row__label">{label}</span>
      <div className="lesson-row__value">
        {state ? <StatusPill value={state} t={(key, fallback) => fallback || key} label={children} /> : children}
      </div>
    </div>
  );
}

function LessonCard({ id, lesson, t }) {
  const pointsKey = pickFirst(lesson, ["points", "lesson_points", "concise_points"]);
  const warningsKey = pickFirst(lesson, ["warnings", "lesson_warnings"]);
  const nextKey = pickFirst(lesson, ["next_learning_action", "next_safe_action", "next_action"]);
  const attentionCount = lessonAttentionCount(lesson);
  const points = pointsKey ? asArray(lesson[pointsKey]) : [];
  const warnings = warningsKey ? asArray(lesson[warningsKey]) : [];
  const visualState = statusToneFromReview(attentionCount, lesson.status);
  const statusLabel = attentionCount ? t("detail.lesson.needsAttention") : stateLabel(lesson.status, t);
  const progressLabel = normalizeState(lesson.status) === "passed" ? t("detail.lesson.completed") : t("detail.lesson.inProgress");
  const sourceFile = displayText(lesson.source_state_file, "");
  const nextActionDisplay = attentionCount ? t("detail.lesson.reviewSettings") : displayText(lesson[nextKey]);
  return (
    <article className={`lesson-panel lesson-panel--${normalizeState(visualState)}`} data-lesson-card={id}>
      <div className="lesson-panel__band">
        <span>
          {attentionCount ? <AlertTriangle aria-hidden="true" size={18} /> : <CheckCircle2 aria-hidden="true" size={18} />}
          {statusLabel}
        </span>
        {attentionCount ? (
          <small>
            <CircleDashed aria-hidden="true" size={13} />
            {t("detail.lesson.someUnset")}
          </small>
        ) : null}
      </div>
      <div className="lesson-panel__hero">
        <span className="lesson-panel__icon">
          <BookOpen aria-hidden="true" size={26} />
        </span>
        <div>
          <h3>{displayText(lesson.label, displayKey(id))}</h3>
        </div>
            <StatusPill value={visualState} t={t} label={progressLabel} />
      </div>
      {warnings.length || attentionCount ? (
        <div className="lesson-callout">
          <AlertTriangle aria-hidden="true" size={17} />
          <div>
            <strong>{lessonPrimaryAttentionText(lesson, t)}</strong>
            <span>{lessonAttentionDetailText(lesson, t)}</span>
          </div>
          <ChevronRight aria-hidden="true" size={17} />
        </div>
      ) : null}
      <div className="lesson-rows">
        <LessonRow Icon={Compass} label={t("field.current")}>{displayText(lesson.current_step)}</LessonRow>
        <LessonRow Icon={GraduationCap} label={t("field.learningMode")}>{stateLabel(lesson.learning_mode_status, t)}</LessonRow>
        <LessonRow Icon={Globe2} label={t("field.workflowLanguage")}>{stateLabel(lesson.workflow_language_status, t)}</LessonRow>
        <LessonRow Icon={Code2} label={t("field.productLanguage")}>{stateLabel(lesson.product_language_status, t)}</LessonRow>
        {sourceFile ? <LessonRow Icon={File} label={t("field.source")}>{technicalChip(sourceFile)}</LessonRow> : null}
        <LessonRow Icon={CheckCircle2} label={t("list.points")}>{points.length ? countWithUnit(points.length, "detail.lesson.pointsUnit", t) : t("summary.none")}</LessonRow>
        <LessonRow Icon={AlertTriangle} label={t("list.warnings")}>{warnings.length ? countWithUnit(warnings.length, "detail.lesson.warningsUnit", t) : t("detail.lesson.noWarnings")}</LessonRow>
        {nextKey ? <LessonRow Icon={Target} label={t("detail.lesson.nextAction")}>{nextActionDisplay}</LessonRow> : null}
      </div>
    </article>
  );
}

function lessonProgressPercent(lesson, metric, selected) {
  if (selected && Number.isFinite(Number(metric?.percent))) {
    return clampPercent(metric.percent);
  }
  const state = normalizeState(lesson?.status);
  if (state === "passed") {
    return 100;
  }
  if (state === "ready") {
    return 0;
  }
  return 0;
}

function resolveLessonCards(lessons, data, t) {
  const entries = objectEntries(lessons);
  const foundation = entries.find(([id]) => id.includes("foundation") || id.includes("step_1_7")) || entries[0] || ["step_1_7", {}];
  const practical = entries.find(([id]) => id.includes("extended") || id.includes("14") || id.includes("practical")) || entries[1] || ["step_1_14", {}];
  const applied = entries.find(([id]) => id.includes("advanced") || id.includes("applied")) || ["advanced", lessons?.advanced || {}];
  const selected = displayText(selectedContextData(data).menu_id, "step_1_14");
  const metric = data.summary?.category_metrics?.lessons || {};
  return [
    { id: "step_1_7", sourceId: foundation[0], lesson: foundation[1] || {}, title: t("lesson.card.step7"), tone: "warning", selected: selected === "step_1_7" },
    { id: "step_1_14", sourceId: practical[0], lesson: practical[1] || {}, title: t("lesson.card.step14"), tone: "active", selected: selected === "step_1_14" },
    { id: "advanced", sourceId: applied[0], lesson: applied[1] || {}, title: t("lesson.card.advanced"), tone: "advanced", selected: selected === "advanced" },
  ].map((card) => ({
    ...card,
    percent: lessonProgressPercent(card.lesson, metric, card.selected),
    attentionCount: lessonAttentionCount(card.lesson),
  }));
}

function LessonProgressCard({ card, data, t }) {
  const context = selectedContextData(data);
  const cardContext = contextDataForMenu(data, card.id) || {};
  const metric = data.summary?.category_metrics?.lessons || {};
  const progress = contextProgress(card.selected ? context : cardContext, card.selected ? metric : {});
  const total = progress.total || (normalizeState(card.lesson.status) === "passed" ? progress.total : 0);
  const completed = progress.total ? progress.completed : normalizeState(card.lesson.status) === "passed" ? total : 0;
  const percent = progress.total ? progress.percent : card.percent;
  const currentParts = card.selected ? selectedStepParts(context) : selectedStepParts(cardContext);
  const current = card.selected ? selectedStepText(context) : displayText(card.lesson.current_step || currentParts.id || currentParts.short, "");
  const currentId = displayText(card.selected ? context.current_step_id : cardContext.current_step_id, "");
  const currentDetail = card.selected ? localizedStepDetail(context, t) : displayText(cardContext.current_step_label || card.lesson.current_step, "");
  const nextAction = card.selected
    ? nextActionShort(context, data, t)
    : localizedLessonAction(card.lesson.next_learning_action || card.lesson.next_action || t("detail.lesson.reviewSettings"), cardContext, t);
  return (
    <article className={`lesson-progress-card lesson-progress-card--${card.tone}`} data-lesson-card={card.id}>
      <div className="lesson-progress-card__head">
        <span className="lesson-progress-card__icon">
          <BookOpen aria-hidden="true" size={28} />
        </span>
        <div>
          <h3>{card.title}</h3>
        </div>
        <span className={`lesson-progress-card__badge lesson-progress-card__badge--${card.selected ? "selected" : "unselected"}`}>
          {card.selected ? t("lesson.card.selected") : t("lesson.card.unselected")}
        </span>
      </div>
      {card.attentionCount ? (
        <div className="lesson-progress-card__warning">
          <AlertTriangle aria-hidden="true" size={18} />
          <div>
            <strong>{lessonPrimaryAttentionText(card.lesson, t)}</strong>
            <span>{lessonAttentionDetailText(card.lesson, t)}</span>
          </div>
          <ChevronRight aria-hidden="true" size={16} />
        </div>
      ) : null}
      <div className="lesson-progress-card__progress">
        <span>{t("mock.context.progress")}: <AnimatedNumber value={completed} className="lesson-progress-card__progress-number" /> / {total}</span>
        <strong><AnimatedNumber value={percent} className="lesson-progress-card__percent-number" />%</strong>
        <HorizontalProgress percent={percent} />
      </div>
      {card.selected && currentId ? (
        <p className="lesson-progress-card__step">
          <strong>{t("lesson.card.currentStep")}</strong>
          <code>{currentId}</code>
          {currentDetail ? <span>{currentDetail}</span> : null}
        </p>
      ) : (
        <p><strong>{t("mock.context.current")}</strong> {current}</p>
      )}
      <p><strong>{t("lesson.nextLearningAction")}</strong> {nextAction}</p>
    </article>
  );
}

function LessonLiveStatusTable({ data, t }) {
  const context = selectedContextData(data);
  const metric = data.summary?.category_metrics?.lessons || {};
  const progress = contextProgress(context, metric);
  const lesson = selectedLessonObject(data, context);
  const generated = data.generated_at ? formatDashboardDateTime(data.generated_at) : t("app.snapshot");
  const settingsStatus = aggregateLessonSettingsStatus(lesson);
  const repositoryStatus = repositoryPathStateToStatus(context.target_repository?.path_state);
  const reflectionStatus = dashboardReflectionStatus(data);
  const progressStatus = progress.total && progress.completed >= progress.total ? t("detail.lesson.completed") : t("detail.lesson.inProgress");
  const gitCiStatus = gitCiLiveStatus(context, t);
  const rows = [
    { id: "lesson-progress", Icon: FileCheck2, item: t("lesson.live.progress"), status: `${progressStatus} (${t("lesson.live.live")})`, statusTone: "blue", detail: `${contextLabel(context.menu_id, t)} / ${selectedStepShort(context)}` },
    { id: "settings", Icon: Settings, item: t("lesson.live.settings"), status: statusLabelForChip(settingsStatus, t), detail: lessonSettingsDetail(lesson, t) },
    { id: "repository", Icon: Database, item: t("lesson.live.repository"), status: statusLabelForChip(repositoryStatus, t), detail: `${repositoryDisplayName(context.target_repository?.name, t)} (${t("lesson.live.productRepositoryLabel")})` },
    { id: "git-ci", Icon: RefreshCw, item: t("lesson.live.gitCi"), status: gitCiStatus.status, detail: gitCiStatus.detail },
    { id: "dashboard", Icon: FileJson, item: t("lesson.live.dashboard"), status: reflectionStatus === "passed" ? t("lesson.live.dashboardShowing") : statusLabelForChip(reflectionStatus, t), statusTone: reflectionStatus === "passed" ? "" : "orange", detail: dashboardReflectionDetail(data, t) },
  ];
  return (
    <section className="lesson-live-table-section" aria-labelledby="lesson-live-heading">
      <h3 id="lesson-live-heading">
        <Activity aria-hidden="true" size={20} />
        {t("lesson.live.title")}
      </h3>
      <div className="lesson-live-table">
        <div className="lesson-live-table__head">
          <span>{t("lesson.live.item")}</span>
          <span>{t("lesson.live.status")}</span>
          <span>{t("lesson.live.detail")}</span>
          <span>{t("lesson.live.updated")}</span>
        </div>
        {rows.map(({ id, Icon, item, status, statusTone = "green", detail }) => (
          <article className="lesson-live-row" key={id}>
            <span className="lesson-live-row__item"><Icon aria-hidden="true" size={19} />{item}</span>
            <span className={`lesson-live-row__status lesson-live-row__status--${statusTone}`}>{status}</span>
            <span>{detail}</span>
            <span>{generated}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function LessonSection({ lessons, data, locale, t }) {
  const context = selectedContextData(data);
  if (displayText(context.workflow_context, "") !== "lesson") {
    return (
      <section className="view-surface view-surface--lessons" id="lessons" aria-labelledby="lesson-heading">
        <PageTitleHeader viewId="lessons" Icon={BookOpen} title={t("lessons.title")} subtitle={t("lessons.description")} data={data} locale={locale} t={t} actionLabel={t("lesson.snapshotButton")} headingId="lesson-heading" />
        <ContextSnapshotStrip data={data} t={t} locale={locale} variant="workflow" />
        <ProducerDecisionSummary data={data} pageId="lessons" tone="lessons" t={t} />
        <SidebarPageCard
          Icon={WorkflowCategoryIcon}
          title={t("lessons.notLessonTitle")}
          detail={`${t("lessons.notLessonDetail")} ${contextLabel(context.menu_id, t)} / ${repositoryDisplayName(context.target_repository?.name, t)}`}
          status="not_applicable"
          t={t}
        />
      </section>
    );
  }
  const metric = data.summary?.category_metrics?.lessons || {};
  const progress = contextProgress(context, metric);
  const isComplete = progress.total > 0 && progress.completed >= progress.total;
  const lessonCards = resolveLessonCards(lessons, data, t);
  return (
    <section className="view-surface view-surface--lessons" id="lessons" aria-labelledby="lesson-heading">
      <PageTitleHeader viewId="lessons" Icon={BookOpen} title={t("lessons.title")} subtitle={t("lessons.description")} data={data} locale={locale} t={t} actionLabel={t("lesson.snapshotButton")} headingId="lesson-heading" />
      <ContextSnapshotStrip data={data} t={t} locale={locale} variant="lessons" />
      <ProducerDecisionSummary data={data} pageId="lessons" tone="lessons" t={t} />
      <DetailDecisionSummary
        tone="lessons"
        t={t}
        items={[
          { Icon: Target, label: t("detail.checks"), valueLines: lessonSummaryLines(t("detail.lessons.checks")) },
          { Icon: CheckCircle2, label: t("detail.currentJudgment"), value: isComplete ? t("detail.lesson.completed") : t("detail.lesson.inProgress"), detail: progress.total ? `${progress.completed} of ${progress.total} completed` : metricStatusText(metric, t), tone: "progress" },
          { Icon: Eye, label: t("detail.mustReview"), points: [t("detail.lessons.review.currentStep"), t("detail.lessons.review.nextAction"), t("detail.lessons.review.unsyncedWarnings")] },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), valueLines: lessonSummaryLines(t("detail.lessons.nextWorkflowCheck")) },
        ]}
      />
      <div className="lesson-grid">
        {lessonCards.map((card) => (
          <LessonProgressCard card={card} data={data} key={card.id} t={t} />
        ))}
      </div>
      <LessonLiveStatusTable data={data} t={t} />
      <LessonHealthNotice t={t} />
    </section>
  );
}

function StatusObjectCard({ id, value, t, Icon = CircleDashed }) {
  const statusValue = value && typeof value === "object" ? value.status : value;
  const details = value && typeof value === "object" ? value : { status: value };
  const detailFields = objectEntries(details)
    .filter(([key]) => key !== "status")
    .map(([key, fieldValue]) => ({ label: displayKey(key), value: fieldValue }));
  return (
    <article className="item-card">
      <div className="item-card__header">
        <Icon aria-hidden="true" size={20} />
        <h3>{displayKey(id)}</h3>
        <StatusPill value={statusValue} t={t} />
      </div>
      <FieldGrid fields={detailFields} />
    </article>
  );
}

function WorkflowSection({ development, gitWorkflow, data, locale, t, liveStatus }) {
  const workflowItems = collectWorkflowItems({ development, gitWorkflow, t });
  const reviewItems = workflowItems.filter((item) => isReviewState(item.state));
  const context = selectedContextData(data);
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const step = currentStepNumber(context);
  return (
    <section className="view-surface view-surface--workflow" id="workflow" aria-labelledby="workflow-heading">
      <PageTitleHeader viewId="workflow" Icon={WorkflowCategoryIcon} title={t("workflow.title")} subtitle={t("workflow.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="workflow-heading" />
      <ContextSnapshotStrip data={data} t={t} locale={locale} variant="workflow" />
      <ProducerDecisionSummary data={data} pageId="workflow" tone="workflow" t={t} />
      <DetailDecisionSummary
        tone="workflow"
        t={t}
        items={[
          { Icon: Target, label: t("detail.checks"), valueLines: workflowDecisionValueLines(context, t), points: [t("detail.workflow.checksPoint.gitCi"), t("detail.workflow.checksPoint.prMerge"), t("detail.workflow.checksPoint.evidence")] },
          { Icon: CheckCircle2, label: t("detail.currentJudgment"), value: reviewItems.length ? t("detail.judgment.needsReviewShort") : t("detail.judgment.readyShort"), detail: reviewItems.length ? t("detail.workflow.reviewDetail") : t("detail.workflow.noReviewDetail"), badge: statusSummaryBadge(reviewItems.length, t("detail.itemsNeedReview"), t), tone: reviewItems.length ? "warning" : "ready" },
          { Icon: Eye, label: t("detail.mustReview"), value: t("detail.workflow.mustReview"), points: reviewItems.length ? workflowMustReviewPoints(t) : [t("detail.noRequiredReview")] },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: step ? `${t("workflow.card.stepLabel")} ${step} ${t("detail.workflow.nextSafe")}` : t("detail.workflow.nextSafe"), detail: nextActionShort(context, data, t), cta: { href: "#lessons", label: workflowStepDetailLabel(context, t) } },
        ]}
      />
      <OperationalDetailDecisionPanel data={data} context={context} liveStatus={liveStatus} t={t} tone="workflow" pageId="workflow" keys={["local_tests", "git_sync", "ci"]} />
      <GitOperationRail operations={development.git_operations} t={t} />
      <WorkflowStatusCards data={data} t={t} />
      <LiveEvidenceTable liveStatus={liveStatus} context={context} keys={["local_tests", "git_sync", "ci"]} title={t("detail.liveEvidence.workflowTitle")} headingId="workflow-live-evidence-heading" t={t} tone="workflow" />
      <WorkflowRecentTable rows={development.recent_runs} data={data} t={t} />
      <MockNotice
        tone="workflow-warning"
        Icon={AlertTriangle}
        title={t("workflow.warning.title")}
        detail={t("workflow.warning.detail")}
        cta={{ href: "#maintenance", label: t("workflow.warning.cta") }}
      />
    </section>
  );
}

function MaintenanceConfirmationTable({ manualFollowups, warnings, data, t }) {
  const followupRows = manualFollowups.map((item, index) => ({
    id: displayText(item.source, `manual-${index}`),
    Icon: ClipboardCheck,
    label: sourceLabel(item.source, t),
    required: normalizeState(item.status) === "optional" ? t("detail.optional") : t("detail.required"),
    status: item.status,
    why: sourceWhy(item.source, t) || displayText(item.reason),
    location: item.required_command,
    technicalKey: sourcePresentationKey(item.source, t),
  }));
  const warningRows = warnings.map((item, index) => ({
    id: `warning-${index}`,
    Icon: AlertTriangle,
    label: displayText(item.source),
    required: t("detail.optional"),
    status: item.status,
    why: displayText(item.reason),
    location: t("detail.warningLocation"),
    technicalKey: "",
  }));
  const rows = [...followupRows, ...warningRows];
  return (
    <div className="confirmation-table">
      <div className="confirmation-table__head">
        <span>{t("detail.confirm.what")}</span>
        <span>{t("detail.confirm.why")}</span>
        <span>{t("detail.confirm.status")}</span>
        <span>{t("detail.confirm.location")}</span>
      </div>
      {rows.length ? (
        rows.map((row) => {
          const Icon = row.Icon;
          return (
            <article className={`confirmation-row confirmation-row--${normalizeState(row.status)}`} key={row.id}>
              <div className="confirmation-row__name">
                <Icon aria-hidden="true" size={21} />
                <div>
                  <strong>{row.label}</strong>
                  {row.technicalKey ? <span>{row.technicalKey}</span> : null}
                </div>
                <span className="small-badge">{row.required}</span>
              </div>
              <p>{row.why}</p>
              <div>
                <StatusPill value={row.status} t={t} />
              </div>
              <div>{String(row.location).startsWith("./") ? <CommandChip command={row.location} /> : technicalChip(row.location)}</div>
            </article>
          );
        })
      ) : (
        <article className="confirmation-row confirmation-row--empty">
          <div className="confirmation-row__name">
            <CheckCircle2 aria-hidden="true" size={21} />
            <strong>{t("summary.none")}</strong>
          </div>
          <p>{t("detail.confirm.none")}</p>
          <div>
            <StatusPill value="ready" t={t} />
          </div>
          <div>{technicalChip(asArray(data.source_files)[0] || t("summary.none"))}</div>
        </article>
      )}
    </div>
  );
}

function maintenanceEvidenceWhy(id, t) {
  return t(`maintenance.evidenceWhy.${displayText(id)}`, t("maintenance.evidenceWhy.default"));
}

function maintenanceEvidenceWhere(row, t) {
  const id = displayText(row?.id, "");
  const base = t(`maintenance.evidenceWhere.${id}`, t("maintenance.evidenceDetail.where"));
  const references = maintenanceReferenceValues(row);
  if (!references.length) {
    return base;
  }
  return `${base} ${t("maintenance.reference")}: ${references.join(" / ")}`;
}

function maintenanceEvidenceAction(row, t) {
  const id = displayText(row?.id, "");
  const state = normalizeState(row?.status);
  const command = displayText(row?.required_command, "");
  const statusAction = t(`maintenance.evidenceStatusAction.${state}`, "");
  const baseAction = statusAction || t(`maintenance.evidenceAction.${id}`, t("maintenance.evidenceAction.default"));
  if (!command) {
    return baseAction;
  }
  return `${baseAction} ${t("maintenance.evidenceCommand")}: ${command}`;
}

function maintenanceEvidenceSourceRole(row, t) {
  const role = displayText(row?.source_role, "evidence");
  return t(`maintenance.evidenceSourceRole.${role}`, displayKey(role));
}

function maintenanceEvidenceTarget(row, t) {
  const id = displayText(row?.id, "");
  if (id === "product_authority_evidence" && displayText(row?.target, "")) {
    return repositoryDisplayName(row.target, t);
  }
  return t(`maintenance.evidenceTarget.${id}`, displayText(row?.target, maintenanceEvidenceLabel(row, t)));
}

function maintenanceEvidenceInsight(row, t) {
  const id = displayText(row?.id, "");
  const state = normalizeState(row?.status);
  const references = maintenanceReferenceValues(row);
  const label = maintenanceEvidenceLabel(row, t);
  const statusLabel = maintenanceStatusLabel(id, row.status, t);
  const statusMeaning = t(`maintenance.evidenceStatusMeaning.${state}`, statusLabelForChip(row.status, t));
  const observedAt = maintenanceObservedAt(row);
  const unresolvedCount = maintenanceUnresolvedCount(row);
  const points = [
    `${t("maintenance.evidencePoint.target")}: ${maintenanceEvidenceTarget(row, t)}`,
    `${t("maintenance.evidencePoint.role")}: ${maintenanceEvidenceSourceRole(row, t)}`,
    `${t("maintenance.evidencePoint.importance")}: ${displayText(row?.importance, t("summary.none"))}`,
    `${t("maintenance.evidencePoint.priority")}: ${maintenancePriorityLabel(row, t)}`,
    `${t("maintenance.evidencePoint.impact")}: ${maintenanceEvidenceImpact(row, t)}`,
    `${t("maintenance.evidencePoint.completionCondition")}: ${maintenanceEvidenceCompletion(row, t)}`,
  ];
  if (observedAt) {
    points.push(`${t("maintenance.evidencePoint.updatedAt")}: ${observedAt}`);
  }
  if (unresolvedCount > 0) {
    points.push(`${t("maintenance.evidencePoint.unresolved")}: ${maintenanceUnresolvedLabel(unresolvedCount, t)}`);
  }
  return {
    title: label,
    eyebrow: t("maintenance.evidenceDetail"),
    summary: `${label}: ${statusLabel}. ${maintenanceEvidenceWhy(id, t)}`,
    where: maintenanceEvidenceWhere(row, t),
    why: `${maintenanceEvidenceWhy(id, t)} ${statusMeaning} ${t("maintenance.evidencePoint.impact")}: ${maintenanceEvidenceImpact(row, t)}`,
    action: `${maintenanceEvidenceAction(row, t)} ${t("maintenance.evidencePoint.completionCondition")}: ${maintenanceEvidenceCompletion(row, t)}`,
    source: references.length ? references.join(", ") : t("summary.none"),
    status: row.status,
    statusLabel,
    points,
  };
}

function MaintenanceStatusCards({ maintenance, data, t }) {
  const cards = [
    { id: "as_built_sync_status", title: t("maintenance.item.asBuilt"), Icon: RefreshCw, status: maintenance.as_built_sync_status, detail: maintenanceCardCopy("as_built_sync_status", t) },
    { id: "workflow_pair_status", title: t("maintenance.item.workflowPair"), Icon: Waypoints, status: maintenance.workflow_pair_status, detail: maintenanceCardCopy("workflow_pair_status", t) },
    { id: "developer_memory_status", title: t("maintenance.item.developerMemory"), Icon: Brain, status: maintenance.developer_memory_status, detail: maintenanceCardCopy("developer_memory_status", t) },
    { id: "skills_status", title: t("maintenance.item.skills"), Icon: BookOpen, status: maintenance.skills_status, detail: maintenanceCardCopy("skills_status", t) },
    { id: "git_workflow_settings", title: t("maintenance.item.gitWorkflowSettings"), Icon: GitBranch, status: data.git_workflow?.settings_status, detail: maintenanceCardCopy("git_workflow_settings", t) },
    { id: "security_policy", title: t("maintenance.item.securityPolicy"), Icon: ShieldCheck, status: data.security?.policy_status, detail: maintenanceCardCopy("security_policy", t) },
  ];
  return (
    <section className="maintenance-card-grid" aria-label={t("maintenance.statusCards")}>
      {cards.map(({ id, title, Icon, status, detail }) => (
        <article className="maintenance-mini-card" key={id}>
          <span className="maintenance-mini-card__icon">
            <Icon aria-hidden="true" size={24} />
          </span>
          <h3>{title}</h3>
          <StatusPill value={status} t={t} label={maintenanceStatusLabel(id, status, t)} />
          <p>{detail}</p>
        </article>
      ))}
    </section>
  );
}

function BrowserDebugHandoffPanel({ browserDebug, t }) {
  if (!browserDebug || typeof browserDebug !== "object") {
    return null;
  }
  const stages = [
    { id: "manifest", Icon: FileJson, title: t("browserDebug.stage.manifest"), pathKey: "path" },
    { id: "review", Icon: Eye, title: t("browserDebug.stage.review"), pathKey: "artifact_index_path" },
    { id: "agent_package", Icon: FileSearch, title: t("browserDebug.stage.package"), pathKey: "path" },
    { id: "agent_result", Icon: TerminalSquare, title: t("browserDebug.stage.result"), pathKey: "path" },
    { id: "agent_report", Icon: FileText, title: t("browserDebug.stage.report"), pathKey: "path" },
  ].map((stage) => ({
    ...stage,
    data: browserDebug[stage.id] && typeof browserDebug[stage.id] === "object" ? browserDebug[stage.id] : {},
  }));
  const tool = browserDebug.tool && typeof browserDebug.tool === "object" ? browserDebug.tool : {};
  const boundary = browserDebug.boundary && typeof browserDebug.boundary === "object" ? browserDebug.boundary : {};
  const boundarySafe = ["dashboard_executes_browser_debug", "external_upload", "provider_api", "credential_storage", "product_repository_mutated"].every((key) => boundary[key] === false);
  const displayHandoffValue = (value, fallback) => {
    const text = displayText(value, "");
    if (text === "not_collected") {
      return t("browserDebug.notCollected");
    }
    if (text === "not_selected") {
      return t("browserDebug.notSelected");
    }
    return text || fallback;
  };
  const stagePath = (stage) => displayHandoffValue(stage.data[stage.pathKey], t("browserDebug.notCollected"));
  return (
    <section className="evidence-table-section" aria-labelledby="browser-debug-handoff-heading" data-browser-debug-handoff="true">
      <h3 id="browser-debug-handoff-heading">{t("browserDebug.title")}</h3>
      <p className="section-help-text">{t("browserDebug.detail")}</p>
      <section className="maintenance-card-grid" aria-label={t("browserDebug.stageCards")}>
        <article className="maintenance-mini-card">
          <span className="maintenance-mini-card__icon">
            <TerminalSquare aria-hidden="true" size={24} />
          </span>
          <h3>{t("browserDebug.stage.tool")}</h3>
          <StatusPill value={tool.status || "unknown"} t={t} label={statusLabelForChip(tool.status, t)} />
          <p>{displayHandoffValue(browserDebug.selected_cli_repository, t("browserDebug.notSelected"))}</p>
          <CommandChip command={tool.command} />
        </article>
        {stages.map(({ id, Icon, title, data }) => (
          <article className="maintenance-mini-card" key={id}>
            <span className="maintenance-mini-card__icon">
              <Icon aria-hidden="true" size={24} />
            </span>
            <h3>{title}</h3>
            <StatusPill value={data.status || "unknown"} t={t} label={statusLabelForChip(data.status, t)} />
            <p>{stagePath({ data, pathKey: id === "review" ? "artifact_index_path" : "path" })}</p>
          </article>
        ))}
      </section>
      <div className="confirmation-table">
        <div className="confirmation-table__head">
          <span>{t("detail.confirm.what")}</span>
          <span>{t("detail.confirm.why")}</span>
          <span>{t("detail.confirm.status")}</span>
          <span>{t("browserDebug.commandPreview")}</span>
        </div>
        {stages.map(({ id, Icon, title, data }) => (
          <article className={`confirmation-row confirmation-row--${normalizeState(data.status)}`} key={`browser-debug-${id}`}>
            <div className="confirmation-row__name">
              <Icon aria-hidden="true" size={21} />
              <div>
                <strong>{title}</strong>
                <span>{stagePath({ data, pathKey: id === "review" ? "artifact_index_path" : "path" })}</span>
              </div>
              <span className="small-badge">{t("app.readOnly")}</span>
            </div>
            <p>{t(`browserDebug.stageDetail.${id}`)}</p>
            <div>
              <StatusPill value={data.status || "unknown"} t={t} />
            </div>
            <div>
              <CommandChip command={data.command} />
            </div>
          </article>
        ))}
      </div>
      <p className="section-help-text">
        <StatusPill value={boundarySafe ? "ready" : "blocked"} t={t} label={boundarySafe ? t("browserDebug.boundarySafe") : t("browserDebug.boundaryUnsafe")} /> {t("browserDebug.boundary")}
      </p>
    </section>
  );
}

function MaintenanceSection({ maintenance, data, locale, t, liveStatus }) {
  const context = selectedContextData(data);
  const activeLiveStatus = liveStatusForContext(liveStatus, context);
  const displayPolicy = displayDepthPolicyForData(data);
  const manualFollowups = asArray(data.summary?.manual_followups);
  const warnings = asArray(data.warnings).map((warning, index) => ({
    source: `${t("summary.warningItem")} ${index + 1}`,
    status: "optional",
    reason: warning,
  }));
  const metric = data.summary?.category_metrics?.maintenance;
  const maintenanceItems = objectEntries(maintenance).filter(([id]) => id !== "evidence_rows").map(([id, value]) => {
    const meta = maintenanceItemMeta(id, t);
    return {
      id,
      value,
      state: valueState(value),
      technicalKey: presentationKeyFromId(id),
      ...meta,
    };
  });
  const reviewCount = maintenanceItems.filter((item) => isReviewState(item.state)).length + manualFollowups.length + warnings.length;
  return (
    <section className="view-surface view-surface--maintenance" id="maintenance" aria-labelledby="maintenance-heading">
      <PageTitleHeader viewId="maintenance" Icon={RefreshCw} title={t("maintenance.title")} subtitle={t("maintenance.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshMaintenance")} headingId="maintenance-heading" />
      <ContextSnapshotStrip data={data} t={t} locale={locale} variant="maintenance" />
      <ProducerDecisionSummary data={data} pageId="maintenance" tone="maintenance" t={t} />
      <DetailDecisionSummary
        tone="maintenance"
        t={t}
        items={[
          { Icon: Target, label: t("detail.checks"), value: t("detail.maintenance.checks"), detail: t("detail.maintenance.checksDetail") },
          { Icon: Scale, label: t("detail.currentJudgment"), value: reviewCount ? t("detail.maintenance.usableWithFollowup") : t("detail.judgment.readyShort"), detail: t("detail.maintenance.reviewDetail"), tone: reviewCount ? "warning" : "ready" },
          { Icon: Eye, label: t("detail.mustReview"), points: maintenanceReviewPoints(t) },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: t("detail.maintenance.nextSafe"), detail: t("detail.maintenance.nextSafeDetail") },
        ]}
      />
      <OperationalDetailDecisionPanel data={data} context={context} liveStatus={liveStatus} t={t} tone="maintenance" pageId="maintenance" keys={["local_tests", "git_sync", "ci", "security"]} />
      <MaintenanceStatusCards maintenance={maintenance} data={data} t={t} />
      <LiveEvidenceTable liveStatus={liveStatus} context={context} keys={["local_tests", "git_sync", "ci", "security"]} title={t("detail.liveEvidence.maintenanceTitle")} headingId="maintenance-live-evidence-heading" t={t} tone="maintenance" />
      <BrowserDebugHandoffPanel browserDebug={data.browser_debug} t={t} />
      <section className="maintenance-confirmation-section evidence-table-section" aria-labelledby="maintenance-confirmation-heading">
        <h3 id="maintenance-confirmation-heading">{t("maintenance.confirmationFlow")}</h3>
        <p className="section-help-text">{t("maintenance.confirmationFlowDetail")}</p>
        <MaintenanceConfirmationTable manualFollowups={manualFollowups} warnings={warnings} data={data} t={t} />
      </section>
      {activeLiveStatus ? null : <EvidenceRowsTable rows={maintenance.evidence_rows} t={t} displayPolicy={displayPolicy} />}
      <SourceBoundary data={data} t={t} />
      <MockNotice
        tone="maintenance-warning"
        Icon={Info}
        title={t("maintenance.warning.title")}
        detail={t("maintenance.warning.detail")}
        cta={{ href: "#evidence-table-heading", label: t("maintenance.warning.cta") }}
      />
    </section>
  );
}

function failureSeverity(status) {
  const state = normalizeState(status);
  if (state === "blocked" || state === "failed") {
    return "critical";
  }
  if (state === "approval_required" || state === "unknown" || state === "missing") {
    return "warning";
  }
  return "info";
}

function SafetyFailuresTable({ items, t }) {
  const failures = asArray(items);
  return (
    <section className="failure-table-section" aria-labelledby="partial-failures-heading">
      <div className="failure-table-section__head">
        <h3 id="partial-failures-heading">{t("security.partialFailuresTitle")}</h3>
      </div>
      <div className="failure-table">
        <div className="failure-table__head">
          <span>{t("detail.failure.severity")}</span>
          <span>{t("detail.failure.item")}</span>
          <span>{t("detail.failure.source")}</span>
          <span>{t("detail.failure.reason")}</span>
          <span>{t("detail.failure.status")}</span>
          <span>{t("detail.failure.command")}</span>
        </div>
        {failures.length ? (
          failures.map((item, index) => {
            const severity = failureSeverity(item.status);
            const reasonHint = sourceReasonHint(item.source, t);
            const state = normalizeState(item.status);
            const SeverityIcon = state === "failed" ? CircleX : state === "blocked" ? BadgeAlert : AlertTriangle;
            return (
              <article className={`failure-row failure-row--${severity}`} key={`${displayText(item.source)}-${index}`}>
                <div className="failure-row__severity">
                  <SeverityIcon aria-hidden="true" size={22} />
                </div>
                <div className="failure-row__item">
                  <strong>{sourceLabel(item.source, t)}</strong>
                  <span>{sourcePresentationKey(item.source, t)}</span>
                </div>
                <div>{sourceDetector(item.source, t)}</div>
                <div>
                  <p>{localizedSecurityDetail(item.reason, t)}</p>
                  {reasonHint ? <span className="small-badge small-badge--soft">{reasonHint}</span> : null}
                  <InsightDetailButton
                    className="failure-row__detail"
                    detail={safetyFailureInsight(item, t)}
                    label={t("security.failureDetail")}
                    t={t}
                    tone="safety"
                  />
                </div>
                <div>
                  <StatusPill value={item.status} t={t} />
                </div>
                <div>
                  <CommandChip command={item.required_command} />
                </div>
              </article>
            );
          })
        ) : (
          <article className="failure-row failure-row--empty">
            <div className="failure-row__severity">
              <Info aria-hidden="true" size={18} />
            </div>
            <div className="failure-row__empty-message">
              <strong>{t("summary.none")}</strong>
              <span>{t("detail.security.noFailures")}</span>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function securityRowLabel(row, type, t) {
  const id = displayText(row?.id, "");
  return t(`security.rowLabel.${id}`, displayText(row?.label, type === "approval" ? t("security.approvals") : t("security.dangerousOperations")));
}

function securityRowDetail(row, t) {
  return localizedSecurityDetail(row?.detail, t) || t("security.rowDetail.default");
}

function SecurityRowsTable({ rows, title, type, t }) {
  const items = asArray(rows);
  if (!items.length) {
    return null;
  }
  return (
    <section className={`security-row-table security-row-table--${type}`} aria-labelledby={`security-${type}-heading`}>
      <h3 id={`security-${type}-heading`}>{title}</h3>
      <div className="security-row-table__grid">
        <div className="security-row-table__head">
          <span>{t("detail.failure.item")}</span>
          <span>{t("detail.failure.status")}</span>
          <span>{t("security.lastChecked")}</span>
          <span>{t("detail.whyItMatters")}</span>
        </div>
        {items.map((row) => (
          <article className="security-row" key={`${type}-${displayText(row.id)}`}>
            <div className="security-row__name">
              {type === "approval" ? <UserCheck aria-hidden="true" size={20} /> : <AlertTriangle aria-hidden="true" size={20} />}
              <strong>{securityRowLabel(row, type, t)}</strong>
            </div>
            <StatusPill value={row.status} t={t} />
            <span>{formatDashboardDateTime(row.last_checked) || displayText(row.last_checked, t("summary.none"))}</span>
            <p>{securityRowDetail(row, t)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function safetyFailureInsight(item, t) {
  const command = displayText(item.required_command, t("summary.none"));
  return {
    title: sourceLabel(item.source, t),
    eyebrow: t("security.failureDetail"),
    summary: localizedSecurityDetail(item.reason, t),
    where: t("security.failureDetail.where"),
    why: `${sourceReasonHint(item.source, t) || t("security.failureDetail.why")} ${t("security.recoveryPriority")}: ${t("security.recoveryPriority.high")}`,
    action: `${t("security.failureDetail.action")} ${t("security.displayOnlyCommand")}: ${command}`,
    source: command,
    status: item.status,
    statusLabel: statusLabelForChip(item.status, t),
    points: [
      `${t("source.detector.label")}: ${sourceDetector(item.source, t)}`,
      `${t("security.recoveryPriority")}: ${t("security.recoveryPriority.high")}`,
      `${t("security.displayOnlyCommand")}: ${displayText(item.required_command, t("summary.none"))}`,
    ],
  };
}

function SecuritySection({ security, partialFailures, data, locale, t, liveStatus }) {
  const context = selectedContextData(data);
  const securityItems = objectEntries(security).filter(([id]) => !["approvals", "dangerous_operations"].includes(id)).map(([id, value]) => {
    const meta = safetyItemMeta(id, t);
    const hasSecurityGateFailure = id === "gate_status" && asArray(partialFailures).some((failure) => normalizeState(failure.status) === "blocked" || displayText(failure.source) === "security_gate");
    return {
      id,
      value,
      state: hasSecurityGateFailure ? "blocked" : valueState(value),
      technicalKey: presentationKeyFromId(id),
      ...meta,
    };
  });
  const failureCount = asArray(partialFailures).length;
  const reviewCount = securityReviewCount(security, partialFailures);
  const hardBlocked = securityHasHardBlock(security, partialFailures);
  return (
    <div className="safety-primary">
      <PageTitleHeader viewId="safety" Icon={ShieldCheck} title={t("security.title")} subtitle={t("security.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="security-heading" />
      <ContextSnapshotStrip data={data} t={t} locale={locale} variant="safety" />
      <ProducerDecisionSummary data={data} pageId="safety" tone="safety" t={t} />
      <DetailDecisionSummary
        tone="safety"
        t={t}
        items={[
          { Icon: Target, label: t("detail.checks"), value: t("detail.security.checks"), detail: t("detail.security.checksDetail") },
          { Icon: reviewCount ? BadgeAlert : CheckCircle2, label: t("detail.currentJudgment"), value: hardBlocked ? t("detail.judgment.blocked") : reviewCount ? t("detail.judgment.needsReview") : t("detail.judgment.ready"), detail: reviewCount ? t("detail.security.reviewDetail") : t("detail.noRequiredReview"), badge: statusSummaryBadge(reviewCount, t("security.reviewItems"), t), tone: hardBlocked ? "danger" : reviewCount ? "warning" : "ready" },
          { Icon: FileSearch, label: t("detail.mustReview"), points: [t("summary.partialFailures"), t("security.item.approval"), t("actions.title")] },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: t("detail.security.nextSafe"), detail: t("detail.security.nextSafeDetail"), cta: { href: "#partial-failures-heading", label: t("detail.openPartialFailures") } },
        ]}
      />
      <OperationalDetailDecisionPanel data={data} context={context} liveStatus={liveStatus} t={t} tone="safety" pageId="safety" keys={["security", "git_sync", "ci", "local_tests"]} />
      <SecurityStatusCards security={security} partialFailures={partialFailures} data={data} t={t} />
      <LiveEvidenceTable liveStatus={liveStatus} context={context} keys={["security"]} title={t("detail.liveEvidence.safetyTitle")} headingId="safety-live-evidence-heading" t={t} tone="safety" />
      <SecurityRowsTable rows={security?.approvals} title={t("security.approvalTable")} type="approval" t={t} />
      <SecurityRowsTable rows={security?.dangerous_operations} title={t("security.dangerousOperationTable")} type="dangerous" t={t} />
      <SafetyFailuresTable items={partialFailures} t={t} />
    </div>
  );
}

function commandPreviewTechnicalRows(preview, t) {
  return [
    [t("field.target"), preview.target],
    [t("field.risk"), normalizeRisk(preview.risk_level)],
    [t("field.approval"), preview.approval_gate_id],
    [t("field.executionMode"), preview.execution_mode],
  ].filter(([, value]) => displayText(value, ""));
}

function CommandPreviews({ actions, t, displayPolicy = null }) {
  const previews = asArray(actions?.command_previews);
  if (!previews.length) {
    return null;
  }
  return (
    <section className="command-preview-panel" aria-labelledby="action-heading">
      <div className="command-preview-panel__head">
        <div>
          <TerminalSquare aria-hidden="true" size={22} />
          <h2 id="action-heading">{t("actions.title")}</h2>
        </div>
        <p>{t("actions.description")}</p>
      </div>
      <div className="preview-list">
        {previews.map((preview, index) => {
          const technicalRows = commandPreviewTechnicalRows(preview, t);
          const command = <CommandPreviewCommand command={preview.command_text} t={t} />;
          return (
            <article className={`command-preview command-preview--${normalizeRisk(preview.risk_level)}`} key={`${displayText(preview.intent)}-${index}`}>
              <div className="command-preview__head">
                <span className="command-preview__icon">
                  <ShieldCheck aria-hidden="true" size={18} />
                </span>
                <div>
                  <h3>{commandIntentLabel(preview.intent, t)}</h3>
                </div>
              </div>
              {displayPolicy?.collapseTechnicalDetails ? null : command}
              <div className="command-preview__badges">
                <span className="display-only-badge">{t("actions.displayOnly")}</span>
                <span className="display-only-badge">{preview.non_executable === true ? t("actions.notExecutable") : t("field.unknown")}</span>
              </div>
              {displayPolicy?.renderCommandTechnicalDisclosure ? (
                <details className="command-preview__technical" data-dashboard-display-depth={displayPolicy.depth} open={displayPolicy.openTechnicalDetails}>
                  <summary>{t("settingsPage.modal.technicalDetails")}</summary>
                  {displayPolicy.collapseTechnicalDetails ? command : null}
                  {technicalRows.length ? (
                    <dl>
                      {technicalRows.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{displayText(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SecurityPolicyPanel({ security, data, t }) {
  const context = selectedContextData(data);
  const status = security?.policy_status || "unknown";
  const contexts = ["free-development", "product-improvement", "external-integration", "lesson-repository-improvement"];
  const activePolicyContext = displayText(context.workflow_context) === "lesson" ? "lesson-repository-improvement" : displayText(context.menu_id);
  const policyPoints = ["secrets", "approval", "displayOnly", "blockers", "gates"].map((id) => ({
    id,
    title: t(`security.policyRule.${id}.title`),
    detail: t(`security.policyRule.${id}.detail`),
  }));
  return (
    <section className="security-policy-panel" aria-labelledby="security-policy-heading">
      <div className="security-policy-panel__head">
        <div>
          <h2 id="security-policy-heading">{t("security.policyPanel")}</h2>
          <p>{t("security.policyPanelDetail")}</p>
        </div>
      </div>
      <div className="security-policy-panel__chips">
        {contexts.map((id) => (
          <span className={activePolicyContext === id ? "is-active" : ""} key={id}>{contextLabel(id, t)}</span>
        ))}
      </div>
      <div className="security-policy-panel__body">
        <div>
          <FileCheck2 aria-hidden="true" size={20} />
          <p>{t("security.policyScopeDetail")}</p>
        </div>
        <StatusPill value={status} t={t} label={`${t("security.policyActive")}: ${statusLabelForChip(status, t)}`} />
      </div>
      <div className="security-policy-panel__rules">
        {policyPoints.map((point) => (
          <article className="security-policy-rule" key={point.id}>
            <ShieldCheck aria-hidden="true" size={17} />
            <div>
              <strong>{point.title}</strong>
              <p>{point.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SafetySection({ security, actions, partialFailures, data, locale, t, liveStatus }) {
  const displayPolicy = displayDepthPolicyForData(data);
  return (
    <section className="view-surface view-surface--safety" id="safety" aria-labelledby="security-heading">
      <SecuritySection security={security} partialFailures={partialFailures} data={data} locale={locale} t={t} liveStatus={liveStatus} />
      <div className="safety-lower-grid">
        <CommandPreviews actions={actions} t={t} displayPolicy={displayPolicy} />
        <SecurityPolicyPanel security={security} data={data} t={t} />
      </div>
      <MockNotice
        tone="safety-warning"
        Icon={ShieldAlert}
        title={t("security.warning.title")}
        detail={t("security.warning.detail")}
        cta={{ href: "#action-heading", label: t("security.warning.cta") }}
      />
    </section>
  );
}

function SidebarReferenceChip({ value, t }) {
  const text = displayText(value, "");
  if (!text) {
    return null;
  }
  return (
    <span className="sidebar-reference-chip">
      {technicalTooltipValue(text, t("app.technicalReferenceTooltip"), "sidebar-reference-chip__value")}
      <button className="sidebar-reference-chip__copy" type="button" aria-label={`${t("app.copyItem")}: ${text}`} data-copy-tooltip={text} onClick={() => copyTextToClipboard(text)}>
        <Copy aria-hidden="true" size={14} />
      </button>
    </span>
  );
}

function SidebarPageCard({ Icon, title, detail, status, t, children, className = "" }) {
  return (
    <article className={`sidebar-page-card ${className}`.trim()}>
      <div className="sidebar-page-card__head">
        <span className="sidebar-page-card__icon">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div>
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
        {status ? <StatusPill value={status} t={t} label={statusLabelForChip(status, t)} /> : null}
      </div>
      {children ? <div className="sidebar-page-card__body">{children}</div> : null}
    </article>
  );
}

function SidebarPageLinkCard({ Icon, title, detail, href }) {
  return (
    <a className="sidebar-page-link-card" href={href}>
      <span className="sidebar-page-link-card__icon">
        <Icon aria-hidden="true" size={22} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRightCircle aria-hidden="true" size={17} />
    </a>
  );
}

function documentStatusFor(documentId, data) {
  const maintenance = data.maintenance || {};
  const developmentDocumentsStatus = valueState(data.development?.documents || "manual_required");
  if (documentId === "taskTracker" || documentId === "handoff") {
    return valueState(maintenanceEvidenceRow(maintenance, ["workflow_pair"]) || maintenance.workflow_pair_status || "manual_required");
  }
  if (documentId === "developerMemory") {
    return valueState(maintenanceEvidenceRow(maintenance, ["developer_memory"]) || maintenance.developer_memory_status || "manual_required");
  }
  if (documentId === "dashboardDataSchema") {
    return valueState(maintenanceEvidenceRow(maintenance, ["dashboard_data_schema"]) || "manual_required");
  }
  if (documentId === "securityPolicy") {
    return valueState(maintenanceEvidenceRow(maintenance, ["security_policy"]) || data.security?.policy_status || "manual_required");
  }
  return developmentDocumentsStatus;
}

function documentIconFor(item) {
  const roleId = displayText(item.role_id, "");
  const itemId = displayText(item.id, "");
  const map = {
    rulebook: FileText,
    document_map: Folder,
    requirements: FileCheck2,
    specification: FileJson,
    implementation_plan: ListChecks,
    task_tracker: ClipboardCheck,
    handoff: Waypoints,
    developer_memory: Brain,
    dashboard_data_schema: Database,
    security_policy: ShieldCheck,
  };
  return map[roleId] || map[itemId] || FileText;
}

function documentGroupIconFor(group) {
  const groupId = displayText(group.id, "");
  const map = {
    start_here: Folder,
    product_definition: FileCheck2,
    progress_state: Waypoints,
    decision_background: Brain,
    help_when_stuck: CircleHelp,
  };
  return map[groupId] || FileText;
}

function documentItemTitle(item, t) {
  return t(`documentsPage.item.${displayText(item.id, "")}`, displayKey(item.role_id || item.id));
}

function documentItemDetail(item, t) {
  return t(`documentsPage.detail.${displayText(item.id, "")}`, t("documentsPage.detail.fallback"));
}

function documentIntentTitle(item, t) {
  return t(`documentsPage.intent.${displayText(item.id, "")}`, documentItemTitle(item, t));
}

function documentIntentDetail(item, t) {
  return t(`documentsPage.intentDetail.${displayText(item.id, "")}`, documentItemDetail(item, t));
}

function documentGroupStatus(items) {
  const priority = ["failed", "blocked", "stale", "not_run", "unknown", "manual_required", "approval_required", "missing", "optional", "cached", "ready", "passed"];
  const statuses = asArray(items).map((item) => normalizeState(item.status)).filter(Boolean);
  if (!statuses.length) {
    return "unknown";
  }
  return statuses.sort((left, right) => priority.indexOf(left) - priority.indexOf(right))[0] || "unknown";
}

function documentBriefIconFor(card) {
  const id = displayText(card.id, "");
  const map = {
    requirements: Target,
    specification: Workflow,
    implementationPlan: ListChecks,
    taskTracker: ClipboardCheck,
    handoff: Waypoints,
  };
  return map[id] || FileText;
}

function localizedDocumentText(value, fallbackKey, fallback, locale, t) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const localized = displayText(value[locale], "");
    const ja = displayText(value.ja, "");
    const en = displayText(value.en, "");
    const key = displayText(value.key, "");
    if (localized || ja || en) {
      return localized || ja || en;
    }
    if (key) {
      return t(key, fallback);
    }
  }
  return t(displayText(fallbackKey, ""), fallback);
}

function documentBriefTitle(card, t, locale = "en") {
  return localizedDocumentText(card.title, card.title_key, displayKey(card.id), locale, t);
}

function documentBriefDetail(card, t, locale = "en") {
  return localizedDocumentText(card.detail, card.detail_key, "", locale, t);
}

function documentBriefSummary(card, t, locale = "en") {
  return localizedDocumentText(card.summary, card.summary_key, documentBriefDetail(card, t, locale), locale, t);
}

function documentBriefAction(card, t, locale = "en") {
  return localizedDocumentText(card.action, card.action_key, "", locale, t);
}

function documentBriefSourceLabel(card, t) {
  return t(displayText(card.source_label_key, ""), t("documentsPage.source.default"));
}

function documentBriefMetricLabel(card, t) {
  return t(displayText(card.metric_label_key, ""), "");
}

function documentBriefMetricValue(card, t) {
  const raw = displayText(card.metric_value, "");
  if (raw === "brief_freshness") {
    return statusLabelForChip(card.freshness_state || "unknown", t);
  }
  if (raw && normalizeState(raw) !== raw) {
    return raw;
  }
  const localized = t(`documentsPage.brief.metricValue.${displayText(card.id, "")}`, "");
  if (localized) {
    return localized;
  }
  return raw ? statusLabelForChip(raw, t) : "";
}

function documentNextActionTitle(action, t) {
  return t(displayText(action.title_key, ""), displayKey(action.id));
}

function documentNextActionDetail(action, t) {
  return t(displayText(action.detail_key, ""), "");
}

function relatedPageLabel(href, t) {
  const key = displayText(href, "#documents").replace(/^#/, "") || "documents";
  return t(`documentsPage.related.${key}`, displayKey(key));
}

function documentRelatedCommandTitle(command, t) {
  return t(displayText(command.label_key, ""), displayKey(command.id));
}

function documentRelatedCommandDetail(command, t) {
  return t(displayText(command.description_key, ""), t("documentsPage.relatedCommandDetail.default"));
}

function repositoryFileRoleKey(value) {
  return displayText(value, "generic").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "generic";
}

function repositoryPathSpecificRoleLabel(pathValue, t) {
  const path = displayText(pathValue, "");
  if (!path) {
    return "";
  }
  const exact = {
    "AGENTS.MD": "repositoryInfo.pathDescription.agents",
    "README.md": "repositoryInfo.pathDescription.readme",
    "bin/framecue.mjs": "repositoryInfo.pathDescription.framecueCli",
    "ops/PRODUCT_PROFILE.json": "repositoryInfo.pathDescription.productProfile",
    "ops/REPOSITORY_INDEX.json": "repositoryInfo.pathDescription.repositoryIndex",
    "ops/PRODUCT_OPERATION_MODE.tsv": "repositoryInfo.pathDescription.operationMode",
    "tools/product-mode": "repositoryInfo.pathDescription.productModeTool",
    "docs/product/REQUIREMENTS.md": "repositoryInfo.pathDescription.requirements",
    "docs/product/SPECIFICATION.md": "repositoryInfo.pathDescription.specification",
    "docs/product/IMPLEMENTATION_PLAN.md": "repositoryInfo.pathDescription.implementationPlan",
    "docs/workflow/TASK_TRACKER.md": "repositoryInfo.pathDescription.taskTracker",
    "docs/workflow/HANDOFF.md": "repositoryInfo.pathDescription.handoff",
    "docs/workflow/VERIFICATION.md": "repositoryInfo.pathDescription.verification",
    "docs/workflow/SECURITY.md": "repositoryInfo.pathDescription.security",
  };
  if (exact[path]) {
    return t(exact[path], "");
  }
  const patterns = [
    [/^control-center\/src\//, "repositoryInfo.pathDescription.controlCenterSource"],
    [/^control-center\/mocks\//, "repositoryInfo.pathDescription.controlCenterMocks"],
    [/^docs\/design-system\//, "repositoryInfo.pathDescription.designSystem"],
    [/^docs\/product\//, "repositoryInfo.pathDescription.productDoc"],
    [/^docs\/workflow\//, "repositoryInfo.pathDescription.workflowDoc"],
    [/^skills\//, "repositoryInfo.pathDescription.productSkill"],
    [/^tools\/check/, "repositoryInfo.pathDescription.checkTool"],
    [/^tools\//, "repositoryInfo.pathDescription.productTool"],
    [/^ops\//, "repositoryInfo.pathDescription.opsManifest"],
    [/^test\//, "repositoryInfo.pathDescription.test"],
    [/^tests\//, "repositoryInfo.pathDescription.test"],
    [/^src\/generated\/design-system\//, "repositoryInfo.pathDescription.generatedDesignSystem"],
    [/^package(-lock)?\.json$/, "repositoryInfo.pathDescription.packageConfig"],
  ];
  const matched = patterns.find(([pattern]) => pattern.test(path));
  return matched ? t(matched[1], "") : "";
}

function repositoryFileRoleLabel(row, t) {
  const path = displayText(row.path, "");
  if (path.includes("DASHBOARD_DATA_SCHEMA")) {
    return t("repositoryInfo.fileRole.dashboardDataSchema");
  }
  if (path.includes("LESSON_STATE")) {
    return t("repositoryInfo.fileRole.lessonState");
  }
  if (path.includes("PRODUCT_GATE_EVIDENCE_SCHEMA")) {
    return t("repositoryInfo.fileRole.productEvidence");
  }
  if (path.includes("docs/product/REQUIREMENTS")) {
    return t("repositoryInfo.fileRole.productRequirements");
  }
  if (path.includes("TASK_TRACKER")) {
    return t("repositoryInfo.fileRole.taskTracker");
  }
  if (path.includes("HANDOFF")) {
    return t("repositoryInfo.fileRole.handoff");
  }
  const pathDescription =
    repositoryPathSpecificRoleLabel(path, t) ||
    t(`repositoryInfo.pathDescription.${repositoryFileRoleKey(path)}`, "");
  if (pathDescription) {
    return pathDescription;
  }
  const roles = row.roles && typeof row.roles === "object" && !Array.isArray(row.roles) ? row.roles : {};
  for (const roleId of asArray(row.role_ids)) {
    const normalizedRoleId = displayText(roleId, "");
    if (!normalizedRoleId) {
      continue;
    }
    const translatedRole = t(`repositoryInfo.fileRoleId.${normalizedRoleId}`, "");
    if (translatedRole) {
      return translatedRole;
    }
    const role = roles[normalizedRoleId];
    if (!role || typeof role !== "object" || Array.isArray(role)) {
      continue;
    }
    const description = displayText(role.description, "");
    if (description) {
      return description;
    }
    const label = displayText(role.label, "");
    if (label) {
      return label;
    }
  }
  const description = displayText(row.description, "");
  if (description) {
    return description;
  }
  const sourceId = displayText(row.source_id || row.id, "");
  const key = repositoryFileRoleKey(sourceId || path);
  return t(`repositoryInfo.fileRole.${key}`, t("repositoryInfo.fileRole.generic"));
}

function repositoryNodeTooltip(node, t) {
  const item = node.file || {
    path: node.path,
    type: node.type,
    source_id: node.type === "directory" ? "repository_directory" : "repository_file",
    role_ids: [node.type === "directory" ? "repository_directory" : "repository_file"],
  };
  return repositoryFileRoleLabel(item, t);
}

function repositoryFileRows(data, authority) {
  const scopeInventory = data.repository_scope?.inventory && typeof data.repository_scope.inventory === "object" ? data.repository_scope.inventory : {};
  const scopeRoles = scopeInventory.roles && typeof scopeInventory.roles === "object" && !Array.isArray(scopeInventory.roles) ? scopeInventory.roles : {};
  const scopedRows = asArray(scopeInventory.files)
    .map((item) => {
      const path = displayText(item?.path, "");
      if (!path) {
        return null;
      }
      const roleIds = asArray(item.role_ids).map((roleId) => displayText(roleId, "")).filter(Boolean);
      return {
        id: displayText(item.id, `repository-scope:${path}`),
        path,
        source_id: displayText(item.source_id, roleIds[0] || "repository_file"),
        status: normalizeState(item.status || scopeInventory.status || "unknown"),
        required: item.indexed === true || item.index_state === "missing_required",
        type: item.type === "directory" ? "directory" : "file",
        description: displayText(item.description, ""),
        role_ids: roleIds.length ? roleIds : [item.type === "directory" ? "repository_directory" : "repository_file"],
        roles: scopeRoles,
      };
    })
    .filter(Boolean);
  if (scopedRows.length) {
    return scopedRows;
  }

  const repositoryIndex = authority?.repository_index || {};
  const indexedRows = asArray(repositoryIndex.files)
    .map((item) => {
      const path = displayText(item?.path, "");
      if (!path) {
        return null;
      }
      const roleIds = asArray(item.role_ids).map((roleId) => displayText(roleId, "")).filter(Boolean);
      return {
        id: `repository-index:${path}`,
        path,
        source_id: roleIds[0] || "repository_file",
        status: normalizeState(repositoryIndex.status || "unknown"),
        required: item.tracked !== false,
        type: item.type === "directory" ? "directory" : "file",
        description: displayText(item.description, ""),
        role_ids: roleIds,
        roles: repositoryIndex.roles || {},
      };
    })
    .filter(Boolean);
  if (indexedRows.length) {
    return indexedRows;
  }

  return [];
}

function repositoryBuildFileTree(rows) {
  const root = { id: "", name: "", path: "", type: "directory", children: [], childMap: new Map(), file: null };
  for (const row of rows) {
    const segments = displayText(row.path, "").split(/[\\/]/).filter(Boolean);
    const rowType = row.type === "directory" ? "directory" : "file";
    let node = root;
    let currentPath = "";
    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!node.childMap.has(segment)) {
        const isLast = index === segments.length - 1;
        const child = { id: currentPath, name: segment, path: currentPath, type: isLast ? rowType : "directory", children: [], childMap: new Map(), file: null };
        node.childMap.set(segment, child);
        node.children.push(child);
      }
      node = node.childMap.get(segment);
      if (index < segments.length - 1 || rowType === "directory") {
        node.type = "directory";
      }
    }
    node.file = row;
    node.type = rowType;
  }

  function finalize(node) {
    node.children = node.children
      .map(finalize)
      .sort((left, right) => {
        const leftIsDirectory = left.type === "directory" || left.children.length > 0;
        const rightIsDirectory = right.type === "directory" || right.children.length > 0;
        if (leftIsDirectory !== rightIsDirectory) {
          return leftIsDirectory ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
    delete node.childMap;
    return node;
  }

  return finalize(root).children;
}

function repositoryCollectDirectoryIds(nodes) {
  const ids = [];
  for (const node of nodes) {
    if (node.type === "directory" || node.children.length) {
      ids.push(node.id, ...repositoryCollectDirectoryIds(node.children));
    }
  }
  return ids;
}

function repositoryCollectDirectoryIdsByDepth(nodes, maxDepth, level = 0) {
  if (maxDepth <= 0) {
    return [];
  }
  const ids = [];
  for (const node of nodes) {
    const isDirectory = node.type === "directory" || node.children.length > 0;
    if (!isDirectory) {
      continue;
    }
    if (level < maxDepth) {
      ids.push(node.id);
      ids.push(...repositoryCollectDirectoryIdsByDepth(node.children, maxDepth, level + 1));
    }
  }
  return ids;
}

function RepositoryFileTreeNode({ node, level, expandedIds, onToggle, t }) {
  const isDirectory = node.type === "directory" || node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const tooltip = repositoryNodeTooltip(node, t);
  if (isDirectory) {
    return (
      <li className="repository-file-tree__item">
        <button className="repository-file-tree__node repository-file-tree__node--directory" type="button" aria-expanded={isExpanded} data-tooltip={tooltip} onClick={() => onToggle(node.id)} style={{ "--tree-level": level }}>
          <ChevronRight aria-hidden="true" size={16} />
          <Folder aria-hidden="true" size={18} />
          <div>
            <strong>{node.name}</strong>
            <p>{tooltip}</p>
          </div>
          <small>{node.children.length}</small>
        </button>
        {isExpanded ? (
          <ul className="repository-file-tree__children">
            {node.children.map((child) => (
              <RepositoryFileTreeNode node={child} level={level + 1} expandedIds={expandedIds} onToggle={onToggle} t={t} key={child.id} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const file = node.file || {};
  return (
    <li className="repository-file-tree__item">
      <div className="repository-file-tree__node repository-file-tree__node--file" tabIndex={0} data-tooltip={tooltip} style={{ "--tree-level": level }}>
        <FileText aria-hidden="true" size={18} />
        <div>
          <strong title={displayText(file.path || node.path)}>{node.name}</strong>
          <p>{tooltip}</p>
        </div>
        <StatusPill value={file.status || "unknown"} t={t} label={statusLabelForChip(file.status || "unknown", t)} />
      </div>
    </li>
  );
}

function RepositoryFileTree({ rows, t, defaultExpandDepth = 0 }) {
  const tree = useMemo(() => repositoryBuildFileTree(rows), [rows]);
  const directoryIds = useMemo(() => repositoryCollectDirectoryIds(tree), [tree]);
  const rowsKey = useMemo(() => rows.map((row) => `${displayText(row.type, "file")}:${displayText(row.path, "")}`).join("\n"), [rows]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  useEffect(() => {
    const defaultExpandedIds = repositoryCollectDirectoryIdsByDepth(tree, defaultExpandDepth);
    setExpandedIds(new Set(defaultExpandedIds));
  }, [rowsKey, defaultExpandDepth]);

  if (!rows.length) {
    return <p className="repository-empty-note">{t("repositoryInfo.fileMapEmpty")}</p>;
  }

  const toggle = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="repository-file-tree-panel">
      <div className="repository-file-tree-panel__toolbar">
        <span>{t("repositoryInfo.fileMapDetail")}</span>
        <div>
          <button type="button" onClick={() => setExpandedIds(new Set(directoryIds))}>{t("repositoryInfo.expandAll")}</button>
          <button type="button" onClick={() => setExpandedIds(new Set())}>{t("repositoryInfo.collapseAll")}</button>
        </div>
      </div>
      <p className="repository-file-tree-panel__note">
        <Info aria-hidden="true" size={14} />
        <span>{t("repositoryInfo.fileMapFilteredNote")}</span>
      </p>
      <ul className="repository-file-tree" aria-label={t("repositoryInfo.fileMapTitle")}>
        {tree.map((node) => (
          <RepositoryFileTreeNode node={node} level={0} expandedIds={expandedIds} onToggle={toggle} t={t} key={node.id} />
        ))}
      </ul>
    </div>
  );
}

function repositoryOperationDetail(row, t) {
  const detail = displayText(row.detail, "");
  const map = {
    "Push policy is configured.": "repositoryInfo.gitDetail.pushConfigured",
    "Pull request creation follows the configured workflow.": "repositoryInfo.gitDetail.prConfigured",
    "Pull request creation follows the configured Git workflow.": "repositoryInfo.gitDetail.prConfigured",
    "CI evidence is optional in this fixture.": "repositoryInfo.gitDetail.ciOptional",
    "PR CI status is evidence-backed or manual-required.": "repositoryInfo.gitDetail.prCiEvidence",
    "Main CI is display-only evidence.": "repositoryInfo.gitDetail.mainCiEvidence",
    "Main CI status is evidence-backed or manual-required.": "repositoryInfo.gitDetail.mainCiEvidence",
    "Git sync has not been refreshed by a live check.": "repositoryInfo.gitDetail.syncNotRefreshed",
    "Merge remains approval-gated.": "repositoryInfo.gitDetail.mergeGated",
    "Merge remains gated by approval policy.": "repositoryInfo.gitDetail.mergeGated",
  };
  return map[detail] ? t(map[detail]) : detail;
}

function repositoryOperationRows(operations, t) {
  const rows = asArray(operations);
  const hasCommit = rows.some((row) => displayText(row.id) === "commit");
  const commitRow = {
    id: "commit",
    label: t("repositoryInfo.git.commit"),
    status: "manual_required",
    mode: "manual",
    detail: t("repositoryInfo.gitDetail.commitNotCollected"),
  };
  return hasCommit ? rows : [commitRow, ...rows];
}

function RepositoryGitFlow({ operations, t }) {
  const rows = repositoryOperationRows(operations, t);
  if (!rows.length) {
    return <p className="repository-empty-note">{t("repositoryInfo.gitFlowEmpty")}</p>;
  }
  return (
    <div className="repository-operation-grid">
      {rows.map((row) => {
        const Icon = gitOperationIcon(row.id);
        const mode = gitOperationModeClass(row.mode, row.id);
        return (
          <article className="repository-operation-card" key={displayText(row.id)}>
            <span className="repository-operation-card__icon">
              <Icon aria-hidden="true" size={20} />
            </span>
            <div>
              <strong>{gitOperationDisplayLabel(row.id, row.label, t)}</strong>
              <p>{repositoryOperationDetail(row, t)}</p>
            </div>
            <div className="repository-operation-card__meta">
              <StatusPill value={row.status} t={t} label={workflowStatusLabel(row.status, t)} />
              <span className={`mode-pill mode-pill--${mode}`}>{gitOperationModeLabel(row.mode, t, row.id)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RepositoryRunEvidence({ rows, data, t }) {
  const context = selectedContextData(data);
  const visibleRows = asArray(rows).slice(0, 6);
  if (!visibleRows.length) {
    return <p className="repository-empty-note">{t("repositoryInfo.runEvidenceEmpty")}</p>;
  }
  return (
    <div className="repository-run-list">
      {visibleRows.map((row) => (
        <article className="repository-run-row" key={displayText(row.id)}>
          <span>{formatDashboardDateTime(row.time) || displayText(row.time)}</span>
          <strong>{workflowRunTypeLabel(row.type, t)}</strong>
          <p>{workflowRunDetail(row, context, t)}</p>
          <small>{displayText(row.target)}</small>
          <StatusPill value={row.status} t={t} label={workflowStatusLabel(row.status, t)} />
        </article>
      ))}
    </div>
  );
}

function RepositoryWorkspaceSnapshot({ t }) {
  const items = [
    { id: "branch", Icon: GitBranch, title: t("repositoryInfo.workspace.branch"), detail: t("repositoryInfo.workspace.branchDetail") },
    { id: "worktree", Icon: Folder, title: t("repositoryInfo.workspace.worktree"), detail: t("repositoryInfo.workspace.worktreeDetail") },
    { id: "cleanup", Icon: Wrench, title: t("repositoryInfo.workspace.cleanup"), detail: t("repositoryInfo.workspace.cleanupDetail") },
  ];
  return (
    <div className="repository-workspace-grid">
      {items.map(({ id, Icon, title, detail }) => (
        <article className="repository-workspace-card" key={id}>
          <span className="repository-workspace-card__icon">
            <Icon aria-hidden="true" size={20} />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
          <StatusPill value="manual_required" t={t} label={t("repositoryInfo.notCollected")} />
        </article>
      ))}
    </div>
  );
}

function RepositoryRelatedLinks({ t }) {
  const links = [
    { Icon: WorkflowCategoryIcon, title: t("repositoryInfo.related.workflow"), detail: t("repositoryInfo.related.workflowDetail"), href: "#workflow" },
    { Icon: RefreshCw, title: t("repositoryInfo.related.maintenance"), detail: t("repositoryInfo.related.maintenanceDetail"), href: "#maintenance" },
    { Icon: ShieldCheck, title: t("repositoryInfo.related.safety"), detail: t("repositoryInfo.related.safetyDetail"), href: "#safety" },
  ];
  return (
    <div className="sidebar-page-link-grid">
      {links.map((link) => (
        <SidebarPageLinkCard {...link} key={link.title} />
      ))}
    </div>
  );
}

function repositoryProductContentLabel(authority, t, locale) {
  const localizedName = displayText(authority?.product_summary?.display_name?.[locale], "");
  const jaName = displayText(authority?.product_summary?.display_name?.ja, "");
  const enName = displayText(authority?.product_summary?.display_name?.en, "");
  const summaryName = localizedName || jaName || enName || displayText(authority?.product_summary?.name, "");
  return summaryName || t("repositoryInfo.summary.productContent.general");
}

function productTypeLabel(value, t) {
  const id = displayText(value, "unknown");
  return t(`repositoryInfo.productType.${id}`, displayKey(id));
}

function settingsCatalogData(data) {
  const settings = data.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? data.settings : {};
  const groups = asArray(settings.groups).slice().sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
  const items = asArray(settings.items);
  return { settings, groups, items };
}

function settingGroupIconFor(group) {
  const id = displayText(group.id, "");
  const map = {
    context: Compass,
    dashboard: Settings,
    learning: GraduationCap,
    workflow: GitBranch,
    security: ShieldCheck,
  };
  return map[id] || Settings;
}

function settingItemIconFor(item) {
  const id = displayText(item.id, "");
  if (id === "dashboard_display_depth") return Eye;
  if (id.includes("language")) return Globe2;
  if (id.includes("approval")) return UserCheck;
  if (id.includes("security") || id.includes("dangerous")) return ShieldCheck;
  if (id.includes("git") || id.includes("merge") || id.includes("ci")) return GitBranch;
  if (id.includes("repository") || id.includes("product")) return Database;
  if (id.includes("menu")) return Compass;
  return Settings;
}

function settingGroupTitle(group, t) {
  return t(displayText(group.label_key, ""), displayKey(group.id));
}

function settingGroupDetail(group, t) {
  return t(displayText(group.description_key, ""), "");
}

function settingItemTitle(item, t) {
  return t(displayText(item.label_key, ""), displayKey(item.id));
}

function settingItemDetail(item, t) {
  return t(displayText(item.description_key, ""), "");
}

const workflowActionSettingIds = new Set([
  "git_commit_automation",
  "git_push_automation",
  "git_pr_creation",
  "git_pr_ci_monitoring",
  "git_merge_execution",
  "git_main_ci_monitoring",
  "git_sync_monitoring",
]);

function settingIsWorkflowAction(item) {
  return workflowActionSettingIds.has(displayText(item?.id, ""));
}

function settingWorkflowActionValueLabel(value, item, t) {
  if (!settingIsWorkflowAction(item)) {
    return "";
  }
  const normalized = displayText(value, "");
  if (normalized === "false") {
    return t("settingsPage.value.workflow.prohibited");
  }
  if (normalized === "manual") {
    return t("settingsPage.value.workflow.confirmEachTime");
  }
  if (normalized === "after_approval") {
    return t("settingsPage.value.workflow.afterApproval");
  }
  if (normalized === "auto" || normalized === "true") {
    return t("settingsPage.value.workflow.auto");
  }
  return "";
}

function settingShowsAutomationNote(item) {
  if (!settingIsWorkflowAction(item)) {
    return false;
  }
  return settingEditableOptions(item).some((value) => ["auto", "true"].includes(value));
}

function settingShowsApprovalNote(item) {
  if (!settingIsWorkflowAction(item)) {
    return false;
  }
  return settingEditableOptions(item).some((value) => value === "after_approval");
}

function settingIsGitWorkflowSetting(item) {
  return displayText(item?.id, "").startsWith("git_");
}

function settingValueLabel(item, t) {
  const id = displayText(item.id, "");
  const value = displayText(item.current_value, "");
  if (id === "selected_menu") {
    return contextLabel(value, t);
  }
  if (id === "product_type") {
    return productTypeLabel(value, t);
  }
  if (id === "learning_mode") {
    return t(`settingsPage.value.learningMode.${value}`, displayText(item.current_label, value));
  }
  if (id === "dashboard_display_depth") {
    return t(`settingsPage.value.displayDepth.${value}`, displayText(item.current_label, value));
  }
  const workflowActionLabel = settingWorkflowActionValueLabel(value, item, t);
  if (workflowActionLabel) {
    return workflowActionLabel;
  }
  if (id.includes("language")) {
    return t(`settingsPage.value.language.${value}`, displayText(item.current_label, value));
  }
  if (value === "true" || value === "false") {
    return t(`settingsPage.value.boolean.${value}`, value);
  }
  const translated = t(`settingsPage.value.${value}`, "");
  if (translated) {
    return translated;
  }
  if (normalizeState(value) === value) {
    return statusLabelForChip(value, t);
  }
  return displayText(item.current_label || value, t("summary.none"));
}

function settingAllowedValueLabel(value, item, t) {
  const normalized = displayText(value, "");
  const id = displayText(item?.id, "");
  if (!normalized) {
    return "";
  }
  if (id === "learning_mode") {
    return t(`settingsPage.value.learningMode.${normalized}`, normalized);
  }
  if (id === "dashboard_display_depth") {
    return t(`settingsPage.value.displayDepth.${normalized}`, normalized);
  }
  const workflowActionLabel = settingWorkflowActionValueLabel(normalized, item, t);
  if (workflowActionLabel) {
    return workflowActionLabel;
  }
  if (normalized === "true" || normalized === "false") {
    return t(`settingsPage.value.boolean.${normalized}`, normalized);
  }
  return t(`settingsPage.value.${normalized}`, t(`settingsPage.value.language.${normalized}`, normalized));
}

function settingChangeabilityLabel(item, t) {
  if (item.editable) {
    return t("settingsPage.change.editable");
  }
  if (["approval_required", "manual_required"].includes(normalizeState(item.status))) {
    return t("settingsPage.change.approvalRequired");
  }
  if (item.reviewable) {
    return t("settingsPage.change.previewOnly");
  }
  return t(displayText(item.disabled_reason_key, ""), t("settingsPage.change.disabled"));
}

function settingConsistency(item) {
  return item?.consistency && typeof item.consistency === "object" && !Array.isArray(item.consistency) ? item.consistency : {};
}

function settingConsistencyHasNotice(item) {
  const consistency = settingConsistency(item);
  const reasonCode = displayText(consistency.reason_code, "none");
  const status = normalizeState(consistency.status || item?.status || "ready");
  return reasonCode !== "none" || ["blocked", "manual_required", "failed"].includes(status);
}

function settingConsistencyReason(item, t) {
  const consistency = settingConsistency(item);
  const reasonCode = displayText(consistency.reason_code, "none");
  if (reasonCode === "none") {
    return t("settingsPage.consistency.none");
  }
  return t(displayText(consistency.reason_key, ""), displayKey(reasonCode));
}

function settingConsistencyNextAction(item, t) {
  const consistency = settingConsistency(item);
  return t(displayText(consistency.next_action_key, ""), t("settingsPage.consistency.next.none"));
}

function settingRowActionLabel(item, t) {
  return settingChangeabilityLabel(item, t);
}

function settingsSnapshotReconciles(snapshotData, settingId, requestedValue, applyResult = {}) {
  const expectedValue = displayText(requestedValue || applyResult.requested_value || applyResult.requestedValue || applyResult.display_locale || applyResult.current_value, "");
  const { items: snapshotItems } = settingsCatalogData(snapshotData || {});
  const snapshotItem = snapshotItems.find((item) => displayText(item.id, "") === settingId);
  if (!snapshotItem || displayText(snapshotItem.current_value, "") !== expectedValue) {
    return false;
  }

  if (settingId === "dashboard_display_depth") {
    return displayText(snapshotData?.summary?.display_depth, "") === expectedValue;
  }
  if (settingId !== "workflow_language") {
    return true;
  }

  const summary = snapshotData?.summary && typeof snapshotData.summary === "object" ? snapshotData.summary : {};
  const expectedDisplayLocale = displayText(applyResult.display_locale || expectedValue, "");
  const expectedUiLocale = displayText(applyResult.ui_locale || expectedDisplayLocale, "");
  const expectedDirection = displayText(applyResult.direction || applyResult.ui_direction || "", "");
  if (displayText(summary.workflow_language, "") !== expectedValue) {
    return false;
  }
  if (displayText(summary.display_locale, "") !== expectedDisplayLocale) {
    return false;
  }
  if (displayText(summary.ui_locale, "") !== expectedUiLocale) {
    return false;
  }
  return !expectedDirection || displayText(summary.ui_direction, "") === expectedDirection;
}

function withTimeout(promise, timeoutMs, errorMessage) {
  let timeoutId = 0;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function SettingsApplyFeedback({ feedback, t, onDismiss }) {
  if (!feedback || feedback.status === "idle" || !feedback.visible) {
    return null;
  }
  const status = displayText(feedback.status, "reconciling");
  const isAlert = ["blocked", "failed", "stale_snapshot", "timeout"].includes(status);
  const eyebrowKey = status === "applying" ? "settingsPage.applyFeedback.applyingEyebrow" : "settingsPage.applyFeedback.eyebrow";
  const titleKey = {
    applying: "settingsPage.applyFeedback.applyingTitle",
    blocked: "settingsPage.modal.planBlocked",
    reconciled: "settingsPage.applyFeedback.reconciledTitle",
    stale_snapshot: "settingsPage.applyFeedback.staleTitle",
    timeout: "settingsPage.applyFeedback.timeoutTitle",
    failed: "settingsPage.applyFeedback.failedTitle",
  }[status] || "settingsPage.applyFeedback.reconcilingTitle";
  const detailKey = {
    applying: "settingsPage.applyFeedback.applyingDetail",
    blocked: "settingsPage.modal.planBlocked",
    reconciled: "settingsPage.applyFeedback.reconciledDetail",
    stale_snapshot: "settingsPage.applyFeedback.staleDetail",
    timeout: "settingsPage.applyFeedback.timeoutDetail",
    failed: "settingsPage.applyFeedback.failedDetail",
  }[status] || "settingsPage.applyFeedback.reconcilingDetail";
  const pillState = status === "reconciled" ? "passed" : status === "blocked" ? "blocked" : isAlert ? "stale" : "ready";
  const savedDone = feedback.saved === true || ["reconciling", "reconciled", "stale_snapshot", "timeout"].includes(status);
  const savingActive = status === "applying";
  const firstStepKey = savingActive || ((status === "failed" || status === "blocked") && feedback.saved !== true) ? "settingsPage.applyFeedback.stepApplying" : "settingsPage.applyFeedback.stepSaved";
  const checkingDone = ["reconciled"].includes(status);
  return (
    <div
      className={`settings-apply-feedback settings-apply-feedback--${status}`}
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      data-settings-apply-feedback-status={status}
    >
      <div className="settings-apply-feedback__head">
        <RefreshCw aria-hidden="true" size={18} className={["applying", "reconciling"].includes(status) ? "settings-apply-feedback__spinner" : ""} />
        <div>
          <span>{t(eyebrowKey)}</span>
          <strong>{t(titleKey)}</strong>
        </div>
        <StatusPill value={pillState} t={t} label={t(titleKey)} />
      </div>
      <p>{feedback.error ? displayText(feedback.error.message, t(detailKey)) : t(detailKey)}</p>
      <ol className="settings-apply-feedback__steps" aria-label={t("settingsPage.applyFeedback.steps")}>
        <li className={savedDone ? "is-done" : savingActive ? "is-active" : ""}>{t(firstStepKey)}</li>
        <li className={checkingDone ? "is-done" : status === "reconciling" ? "is-active" : ""}>{t("settingsPage.applyFeedback.stepRefreshing")}</li>
        <li className={checkingDone ? "is-done" : ""}>{t("settingsPage.applyFeedback.stepConfirmed")}</li>
      </ol>
      {isAlert ? (
        <button type="button" onClick={onDismiss}>
          {t("settingsPage.applyFeedback.dismiss")}
        </button>
      ) : null}
    </div>
  );
}

function settingRelatedPageLabel(href, t) {
  const target = displayText(href, "#settings").replace(/^#/, "");
  const item = allNavigation.find((entry) => entry.id === target);
  return item ? t(item.labelKey) : displayKey(target);
}

function settingReviewImpact(item, t) {
  const translated = t(displayText(item.review?.impact_key, ""), "");
  if (translated) {
    return translated;
  }
  if (displayText(item.id, "").startsWith("git_")) {
    return t("settingsPage.impact.gitSetting");
  }
  return t("settingsPage.modal.impactFallback");
}

function settingReviewPreview(item, t) {
  const translated = t(displayText(item.review?.update_preview_key, ""), "");
  if (translated) {
    return translated;
  }
  if (displayText(item.id, "").startsWith("git_")) {
    return t("settingsPage.preview.gitSetting");
  }
  return t("settingsPage.modal.previewFallback");
}

function settingEditableOptions(item) {
  return asArray(item.allowed_values).map((value) => displayText(value, "")).filter(Boolean);
}

function repositoryOperationModeLabel(value, t) {
  const mode = displayText(value, "unknown");
  return t(`repositoryInfo.operationMode.${mode}`, displayKey(mode));
}

function repositoryBooleanLabel(value, t) {
  return value === true ? t("repositoryInfo.boolean.true") : t("repositoryInfo.boolean.false");
}

function repositoryLegacyAgentLabel(value, t) {
  const status = displayText(value, "unknown");
  return t(`repositoryInfo.legacyAgent.${status}`, displayKey(status));
}

function repositoryOperationNextActionLabel(value, t) {
  const action = displayText(value, "");
  if (action === "No operation-mode repair is required.") {
    return t("repositoryInfo.operationNext.noRepairRequired");
  }
  return action;
}

function RepositoryRealStatePanel({ authority, context, t }) {
  const operationMode = authority.operation_mode && typeof authority.operation_mode === "object" ? authority.operation_mode : {};
  const blockerCount = asArray(authority.product_operation_blockers).length || asArray(context.blockers).length;
  const hasRealState =
    displayText(operationMode.workflow_mode, "") ||
    displayText(authority.status, "") ||
    displayText(context.evidence_status, "") ||
    displayText(context.security_status, "");
  if (!hasRealState) {
    return null;
  }
  return (
    <DetailSection id="repository-real-state" title={t("repositoryInfo.realStateTitle")} Icon={ShieldCheck}>
      <FieldGrid
        fields={[
          { label: t("repositoryInfo.field.operationMode"), value: operationMode.workflow_mode, render: (value) => repositoryOperationModeLabel(value, t) },
          { label: t("repositoryInfo.field.parentManaged"), value: operationMode.managed_by_parent, render: (value) => repositoryBooleanLabel(value, t) },
          { label: t("repositoryInfo.field.ruleConnection"), value: operationMode.rule_connection_status, render: (value) => <StatusPill value={value} t={t} label={statusLabelForChip(value, t)} /> },
          { label: t("repositoryInfo.field.agentsMd"), value: operationMode.agents_path_status, render: (value) => <StatusPill value={value} t={t} label={statusLabelForChip(value, t)} /> },
          { label: t("repositoryInfo.field.legacyAgent"), value: operationMode.legacy_agent_status, render: (value) => repositoryLegacyAgentLabel(value, t) },
          { label: t("repositoryInfo.field.operationModeSource"), value: operationMode.source_path },
          { label: t("repositoryInfo.field.evidenceStatus"), value: context.evidence_status || authority.status, render: (value) => <StatusPill value={value} t={t} label={statusLabelForChip(value, t)} /> },
          { label: t("repositoryInfo.field.securityStatus"), value: context.security_status, render: (value) => <StatusPill value={value} t={t} label={statusLabelForChip(value, t)} /> },
          { label: t("repositoryInfo.field.blockers"), value: String(blockerCount), render: (value) => `${value} ${t("repositoryInfo.blockerUnit")}` },
          { label: t("repositoryInfo.field.nextSafeAction"), value: operationMode.next_safe_action, render: (value) => repositoryOperationNextActionLabel(value, t) },
        ]}
      />
    </DetailSection>
  );
}

function RepositoryInfoPage({ data, locale, t, liveStatus }) {
  const context = selectedContextData(data);
  const authority = data.development?.product_authority || {};
  const repositoryScope = data.repository_scope && typeof data.repository_scope === "object" ? data.repository_scope : {};
  const scopeInventory = repositoryScope.inventory && typeof repositoryScope.inventory === "object" ? repositoryScope.inventory : {};
  const repositoryIndex = authority.repository_index || {};
  const repository = authority.repository || {};
  const repositoryIndexSummary = scopeInventory.summary || repositoryIndex.summary || {};
  const selectedRepository = repositoryDisplayName(context.target_repository?.name || repositoryScope.repository_name || repository.configured_name || repository.name, t);
  const fileRows = repositoryFileRows(data, authority);
  const repositoryStructureValue = Number(repositoryIndexSummary.total)
    ? `${Number(repositoryIndexSummary.directories) || 0} ${t("repositoryInfo.summary.directories")} / ${Number(repositoryIndexSummary.files) || 0} ${t("repositoryInfo.summary.files")}`
    : Number(repositoryIndexSummary.directories) || Number(repositoryIndexSummary.files)
      ? `${Number(repositoryIndexSummary.directories) || 0} ${t("repositoryInfo.summary.directories")} / ${Number(repositoryIndexSummary.files) || 0} ${t("repositoryInfo.summary.files")}`
    : t("repositoryInfo.notCollected");
  const repositoryStructureStatus = normalizeState(scopeInventory.status || repositoryIndex.status || "unknown");

  return (
    <section className="view-surface view-surface--repository-info sidebar-page" id="repository-info" aria-labelledby="repository-info-heading">
      <DetailPageHeader tone="repository-info" Icon={Info} title={t("repositoryInfo.title")} subtitle={t("repositoryInfo.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="repository-info-heading" />
      <ProducerDecisionSummary data={data} pageId="repository-info" tone="sidebar" t={t} />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: Database, label: t("repositoryInfo.summary.target"), value: selectedRepository, detail: contextLabel(context.menu_id, t) },
          { Icon: Compass, label: t("repositoryInfo.summary.context"), value: contextLabel(context.menu_id, t), detail: workflowContextLabel(context.workflow_context, t) },
          { Icon: FileSearch, label: t("repositoryInfo.summary.structure"), value: repositoryStructureValue, detail: t("repositoryInfo.summary.structureDetail"), tone: repositoryStructureStatus === "ready" ? "ready" : "warning" },
          { Icon: ClipboardCheck, label: t("repositoryInfo.summary.productContent"), value: repositoryProductContentLabel(authority, t, locale), detail: t("repositoryInfo.summary.productContentDetail") },
        ]}
      />
      <OperationalDetailDecisionPanel data={data} context={context} liveStatus={liveStatus} t={t} tone="workflow" pageId="repository-info" keys={["git_sync", "local_tests", "ci", "security"]} />
      <DetailSection id="repository-context" title={t("repositoryInfo.contextTitle")} Icon={Compass}>
        <FieldGrid
          fields={[
            { label: t("repositoryInfo.field.menu"), value: context.menu_id, render: () => contextLabel(context.menu_id, t) },
            { label: t("repositoryInfo.field.workflow"), value: context.workflow_context, render: () => workflowContextLabel(context.workflow_context, t) },
            { label: t("repositoryInfo.field.repository"), value: selectedRepository },
            { label: t("repositoryInfo.field.productType"), value: context.product_type, render: (value) => productTypeLabel(value, t) },
            { label: t("repositoryInfo.field.currentStep"), value: currentStepTextDisplay(context, t) },
            { label: t("repositoryInfo.field.updated"), value: context.updated_at, render: (value) => formatDashboardDateTime(value) || displayText(value) },
            { label: t("repositoryInfo.field.pathState"), value: context.target_repository?.path_state, render: (value) => <StatusPill value={repositoryPathStateToStatus(value)} t={t} label={t(`repositoryInfo.pathState.${displayText(value, "unknown")}`, displayKey(value))} /> },
          ]}
        />
      </DetailSection>
      <RepositoryRealStatePanel authority={authority} context={context} t={t} />
      <LiveEvidenceTable liveStatus={liveStatus} context={context} keys={["git_sync", "ci", "local_tests", "security"]} title={t("detail.liveEvidence.repositoryTitle")} headingId="repository-live-evidence-heading" t={t} tone="workflow" />
      <DetailSection id="repository-file-map" title={t("repositoryInfo.fileMapTitle")} Icon={FileSearch}>
        <RepositoryFileTree rows={fileRows} t={t} defaultExpandDepth={0} />
      </DetailSection>
      <DetailSection id="repository-related" title={t("repositoryInfo.relatedTitle")} Icon={ArrowRightCircle}>
        <RepositoryRelatedLinks t={t} />
      </DetailSection>
      <SourceBoundary data={data} t={t} />
    </section>
  );
}

function DocumentsPage({ data, locale, t }) {
  const [selectedBriefId, setSelectedBriefId] = useState("");
  const context = selectedContextData(data);
  const authority = data.development?.product_authority || {};
  const documents = data.documents || {};
  const catalog = asArray(documents.catalog).slice().sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
  const briefCards = asArray(documents.brief_cards).slice().sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
  const nextActions = asArray(documents.next_actions).slice().sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
  const relatedPages = Array.from(new Set(catalog.map((item) => displayText(item.related_page, "")).filter((href) => href && href !== "#documents")));
  const selectedBrief = briefCards.find((card) => displayText(card.id, "") === selectedBriefId) || null;
  const SelectedBriefIcon = selectedBrief ? documentBriefIconFor(selectedBrief) : FileText;
  const selectedRepository = repositoryDisplayName(context.target_repository?.name || authority.repository?.configured_name || authority.repository?.name, t);
  const productName = repositoryProductContentLabel(authority, t, locale);
  const stepShort = currentStepShortDisplay(context, t);
  const stepDetail = currentStepDetailDisplay(context, t);

  return (
    <section className="view-surface view-surface--documents sidebar-page" id="documents" aria-labelledby="documents-heading">
      <DetailPageHeader tone="documents" Icon={FileText} title={t("documentsPage.title")} subtitle={t("documentsPage.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="documents-heading" />
      <ProducerDecisionSummary data={data} pageId="documents" tone="sidebar" t={t} />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: Compass, label: t("documentsPage.summary.selectedMenu"), value: contextLabel(context.menu_id, t), detail: t("documentsPage.summary.selectedMenuDetail") },
          { Icon: Database, label: t("documentsPage.summary.targetRepository"), value: selectedRepository, detail: t("documentsPage.summary.targetRepositoryDetail") },
          { Icon: ClipboardCheck, label: t("documentsPage.summary.productName"), value: productName, detail: t("documentsPage.summary.productNameDetail") },
          { Icon: Flag, label: t("documentsPage.summary.currentStep"), valueLines: [stepShort, stepDetail].filter(Boolean), detail: t("documentsPage.summary.currentStepDetail") },
        ]}
      />
      <DetailSection id="documents-brief" title={t("documentsPage.briefTitle")} Icon={FileText}>
        {briefCards.length ? (
          <div className="documents-brief-grid">
            {briefCards.map((card) => {
              const Icon = documentBriefIconFor(card);
              return (
                <button className="documents-brief-card" type="button" onClick={() => setSelectedBriefId(displayText(card.id))} key={displayText(card.id)} aria-label={`${documentBriefTitle(card, t, locale)} ${t("documentsPage.brief.open")}`}>
                  <div className="documents-brief-card__head">
                    <span className="documents-brief-card__icon">
                      <Icon aria-hidden="true" size={21} />
                    </span>
                    <div>
                      <h3>{documentBriefTitle(card, t, locale)}</h3>
                      <span className="documents-brief-card__source">
                        {t("documentsPage.source.prefix")}: <strong>{documentBriefSourceLabel(card, t)}</strong>
                      </span>
                      <p>{documentBriefDetail(card, t, locale)}</p>
                    </div>
                    <StatusPill value={card.status || "unknown"} t={t} label={statusLabelForChip(card.status, t)} />
                  </div>
                  <div className="documents-brief-card__metric">
                    <span>{documentBriefMetricLabel(card, t)}</span>
                    <strong>{documentBriefMetricValue(card, t)}</strong>
                  </div>
                  <span className="documents-brief-card__open">
                    <Eye aria-hidden="true" size={15} />
                    {t("documentsPage.brief.open")}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <SidebarPageCard Icon={AlertTriangle} title={t("documentsPage.emptyTitle")} detail={t("documentsPage.emptyDetail")} status="unknown" t={t} />
        )}
      </DetailSection>
      <DetailSection id="documents-next-actions" title={t("documentsPage.nextTitle")} Icon={ArrowRightCircle}>
        <div className="documents-next-list">
          {nextActions.map((action) => (
            <a className="documents-next-row" href={displayText(action.related_page, "#documents")} key={displayText(action.id)}>
              <span className="documents-next-row__icon">
                <ArrowRightCircle aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>{documentNextActionTitle(action, t)}</strong>
                <small>{documentNextActionDetail(action, t)}</small>
              </span>
              <StatusPill value={action.status || "unknown"} t={t} label={statusLabelForChip(action.status, t)} />
            </a>
          ))}
        </div>
      </DetailSection>
      {selectedBrief ? (
        <div className="documents-brief-modal-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedBriefId("");
          }
        }}>
          <div className="documents-brief-modal" role="dialog" aria-modal="true" aria-labelledby="documents-brief-modal-title">
            <div className="documents-brief-modal__header">
              <span className="documents-brief-modal__icon">
                <SelectedBriefIcon aria-hidden="true" size={24} />
              </span>
              <div>
                <small>{t("documentsPage.modal.eyebrow")}</small>
                <h2 id="documents-brief-modal-title">{documentBriefTitle(selectedBrief, t, locale)}</h2>
                <span className="documents-brief-modal__source">
                  {t("documentsPage.source.prefix")}: <strong>{documentBriefSourceLabel(selectedBrief, t)}</strong>
                </span>
                <p>{documentBriefDetail(selectedBrief, t, locale)}</p>
              </div>
              <button className="documents-brief-modal__close" type="button" onClick={() => setSelectedBriefId("")} aria-label={t("documentsPage.modal.close")}>
                <CircleX aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="documents-brief-modal__status">
              <div>
                <span>{documentBriefMetricLabel(selectedBrief, t)}</span>
                <strong>{documentBriefMetricValue(selectedBrief, t)}</strong>
              </div>
              <StatusPill value={selectedBrief.status || "unknown"} t={t} label={statusLabelForChip(selectedBrief.status, t)} />
            </div>
            <div className="documents-brief-modal__freshness">
              <span>{t("documentsPage.modal.freshness")}</span>
              <StatusPill value={selectedBrief.freshness_state || "unknown"} t={t} label={statusLabelForChip(selectedBrief.freshness_state, t)} />
              <small>{t("documentsPage.modal.updatedAt")}: {formatDashboardDateTime(selectedBrief.brief_updated_at) || t("summary.none")}</small>
            </div>
            <div className="documents-brief-modal__body">
              <section>
                <h3>{t("documentsPage.modal.summaryTitle")}</h3>
                <p>{documentBriefSummary(selectedBrief, t, locale)}</p>
              </section>
              <section>
                <h3>{t("documentsPage.modal.actionTitle")}</h3>
                <p>{documentBriefAction(selectedBrief, t, locale)}</p>
              </section>
              <section>
                <h3>{t("documentsPage.modal.sourcePathsTitle")}</h3>
                <ul className="documents-brief-modal__source-list">
                  {asArray(selectedBrief.source_paths).map((sourcePath) => (
                    <li key={displayText(sourcePath)}>
                      <code>{displayText(sourcePath)}</code>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="documents-brief-modal__footer">
              <a href={displayText(selectedBrief.related_page, "#documents")} onClick={() => setSelectedBriefId("")}>
                {t("documentsPage.modal.related")}
                <ChevronRight aria-hidden="true" size={16} />
              </a>
            </div>
          </div>
        </div>
      ) : null}
      <DetailSection id="documents-related" title={t("documentsPage.relatedTitle")} Icon={ArrowRightCircle}>
        <div className="sidebar-page-link-grid">
          {relatedPages.map((href) => (
            <SidebarPageLinkCard Icon={ArrowRightCircle} title={relatedPageLabel(href, t)} detail={t(`documentsPage.relatedDetail.${displayText(href, "").replace(/^#/, "")}`, t("documentsPage.relatedDetail.default"))} href={href} key={href} />
          ))}
        </div>
      </DetailSection>
    </section>
  );
}

const DESIGN_STUDIO_TOOLTIP_WIDTH_OPTIONS = ["260px", "300px", "360px"];
const DESIGN_STUDIO_COPY_DURATION_OPTIONS = [800, 1200, 1800];
const DESIGN_STUDIO_DISPLAY_CONDITION_OPTIONS = ["hover-only", "disabled"];
const DESIGN_STUDIO_THEME_OPTIONS = ["blue", "teal", "slate"];
const DESIGN_STUDIO_DENSITY_OPTIONS = ["compact", "balanced", "comfortable"];
const DESIGN_STUDIO_RADIUS_OPTIONS = ["compact", "standard", "soft"];
const DESIGN_STUDIO_TYPOGRAPHY_OPTIONS = ["standard", "large"];
const DESIGN_STUDIO_ACTION_CONTROL_HEIGHT_OPTIONS = ["32px", "34px", "38px"];
const DESIGN_STUDIO_ACTION_CONTROL_PADDING_OPTIONS = ["6px 10px", "8px 11px", "9px 13px"];
const DESIGN_STUDIO_COMPACT_CONTROL_HEIGHT_OPTIONS = ["30px", "32px", "34px"];
const DESIGN_STUDIO_COMPACT_CONTROL_PADDING_OPTIONS = ["4px 8px", "5px 10px", "6px 12px"];
const DESIGN_STUDIO_FORM_CONTROL_HEIGHT_OPTIONS = ["38px", "40px", "44px"];
const DESIGN_STUDIO_FORM_CONTROL_PADDING_OPTIONS = ["0 9px", "0 10px", "0 12px"];
const DESIGN_STUDIO_ICON_BUTTON_SIZE_OPTIONS = ["34px", "38px", "42px"];
const DESIGN_STUDIO_CONTROL_FONT_SIZE_OPTIONS = ["0.82rem", "0.84rem", "0.9rem"];
const DESIGN_STUDIO_CARD_PADDING_OPTIONS = ["12px", "14px", "16px"];
const DESIGN_STUDIO_CARD_GAP_OPTIONS = ["8px", "10px", "12px"];
const DESIGN_STUDIO_ROW_PADDING_OPTIONS = ["9px 10px", "10px 12px", "12px 14px"];
const DESIGN_STUDIO_ROW_GAP_OPTIONS = ["8px", "10px", "12px"];
const DESIGN_STUDIO_TECHNICAL_GAP_OPTIONS = ["4px", "6px", "8px"];
const DESIGN_STUDIO_SOURCE_WIDTH_OPTIONS = ["220px", "260px", "300px"];
const DESIGN_STUDIO_EVIDENCE_WIDTH_OPTIONS = ["260px", "292px", "320px"];
const DESIGN_STUDIO_PREVIEW_WIDTH_OPTIONS = ["320px", "360px", "420px"];
const DESIGN_STUDIO_PAGE_HEADER_PADDING_OPTIONS = ["16px 18px", "18px 20px", "20px 22px"];
const DESIGN_STUDIO_METADATA_GAP_OPTIONS = ["6px", "8px", "10px"];
const DESIGN_STUDIO_PAGE_ICON_SIZE_OPTIONS = ["44px", "52px", "56px"];
const DESIGN_STUDIO_BADGE_GAP_OPTIONS = ["4px", "5px", "6px"];
const DESIGN_STUDIO_BADGE_HEIGHT_OPTIONS = ["24px", "26px", "28px"];
const DESIGN_STUDIO_MODE_BADGE_PADDING_OPTIONS = ["3px 10px", "4px 14px", "5px 16px"];
const DESIGN_STUDIO_BADGE_FONT_SIZE_OPTIONS = ["0.72rem", "0.76rem", "0.8rem"];
const DESIGN_STUDIO_MODE_BADGE_FONT_SIZE_OPTIONS = ["0.74rem", "0.78rem", "0.82rem"];
const DESIGN_STUDIO_FOUNDATION_PRESETS = {
  themeAccent: {
    blue: { pageAccent: "#1559c7", pageSoft: "#e8f0ff", pageBorder: "#b8cdf7" },
    teal: { pageAccent: "#0f766e", pageSoft: "#e6fffb", pageBorder: "#99d7d0" },
    slate: { pageAccent: "#334155", pageSoft: "#eef2f7", pageBorder: "#cbd5e1" },
  },
  density: {
    compact: { sectionGap: "12px", panelPadding: "12px", controlGap: "8px" },
    balanced: { sectionGap: "16px", panelPadding: "16px", controlGap: "10px" },
    comfortable: { sectionGap: "20px", panelPadding: "20px", controlGap: "12px" },
  },
  radiusScale: {
    compact: { radius: "6px" },
    standard: { radius: "8px" },
    soft: { radius: "10px" },
  },
  typographyScale: {
    standard: { body: "0.92rem", sectionTitle: "1rem", pageTitle: "1.35rem" },
    large: { body: "0.98rem", sectionTitle: "1.06rem", pageTitle: "1.45rem" },
  },
};

function designStudioComponentById(id) {
  return dashboardControlCenterDesignSystem.components.find((component) => component.id === id) || null;
}

function designStudioTokenValue(name) {
  return dashboardControlCenterDesignSystem.tokens.find((token) => token.name === name)?.value || "";
}

function designStudioMatchPreset(group, tokenValues, fallback) {
  return Object.entries(group).find(([, preset]) => Object.entries(preset).every(([key, value]) => tokenValues[key] === value))?.[0] || fallback;
}

function designStudioFoundation() {
  const themeTokens = {
    pageAccent: designStudioTokenValue("page-accent"),
    pageSoft: designStudioTokenValue("page-soft"),
    pageBorder: designStudioTokenValue("page-border"),
  };
  const densityTokens = {
    sectionGap: designStudioTokenValue("section-gap"),
    panelPadding: designStudioTokenValue("panel-padding"),
    controlGap: designStudioTokenValue("control-gap"),
  };
  const radiusTokens = { radius: designStudioTokenValue("default-radius") };
  const typeTokens = {
    body: designStudioTokenValue("font-size-body"),
    sectionTitle: designStudioTokenValue("font-size-section-title"),
    pageTitle: designStudioTokenValue("font-size-page-title"),
  };
  return {
    targetScope: "dashboard-control-center",
    themeAccent: designStudioMatchPreset(DESIGN_STUDIO_FOUNDATION_PRESETS.themeAccent, themeTokens, "blue"),
    density: designStudioMatchPreset(DESIGN_STUDIO_FOUNDATION_PRESETS.density, densityTokens, "balanced"),
    radiusScale: designStudioMatchPreset(DESIGN_STUDIO_FOUNDATION_PRESETS.radiusScale, radiusTokens, "standard"),
    typographyScale: designStudioMatchPreset(DESIGN_STUDIO_FOUNDATION_PRESETS.typographyScale, typeTokens, "standard"),
    actionControlHeight: designStudioTokenValue("action-control-height") || "34px",
    actionControlPadding: designStudioTokenValue("action-control-padding") || "8px 11px",
    compactControlHeight: designStudioTokenValue("compact-control-height") || "32px",
    compactControlPadding: designStudioTokenValue("compact-control-padding") || "5px 10px",
    formControlHeight: designStudioTokenValue("form-control-height") || "40px",
    formControlPadding: designStudioTokenValue("form-control-padding") || "0 10px",
    iconButtonSize: designStudioTokenValue("icon-button-size") || "38px",
    controlFontSize: designStudioTokenValue("control-font-size") || "0.84rem",
    cardPadding: designStudioTokenValue("card-padding") || "14px",
    cardGap: designStudioTokenValue("card-gap") || "10px",
    rowPadding: designStudioTokenValue("row-padding") || "10px 12px",
    rowGap: designStudioTokenValue("row-gap") || "10px",
    technicalAffordanceGap: designStudioTokenValue("technical-affordance-gap") || "4px",
    technicalSourceMaxWidth: designStudioTokenValue("technical-source-max-width") || "260px",
    technicalEvidenceMaxWidth: designStudioTokenValue("technical-evidence-max-width") || "292px",
    technicalPreviewChipMaxWidth: designStudioTokenValue("technical-preview-chip-max-width") || "360px",
    pageHeaderPadding: designStudioTokenValue("page-header-padding") || "18px 20px",
    metadataGap: designStudioTokenValue("metadata-gap") || "8px",
    pageIconSize: designStudioTokenValue("page-icon-size") || "52px",
    badgeGap: designStudioTokenValue("badge-gap") || "5px",
    badgeHeight: designStudioTokenValue("badge-height") || "26px",
    modeBadgePadding: designStudioTokenValue("mode-badge-padding") || "4px 14px",
    badgeFontSize: designStudioTokenValue("badge-font-size") || "0.76rem",
    modeBadgeFontSize: designStudioTokenValue("mode-badge-font-size") || "0.78rem",
  };
}

function designStudioInteraction(component) {
  const interaction = component?.interaction || {};
  return {
    foundation: designStudioFoundation(),
    tooltip: {
      trigger: interaction.tooltip?.trigger || "hover-only",
      hidePolicy: interaction.tooltip?.hidePolicy || "pointer-leave",
      placement: interaction.tooltip?.placement || "top",
      maxWidth: interaction.tooltip?.maxWidth || "300px",
      delayMs: Number(interaction.tooltip?.delayMs) || 0,
    },
    copyFeedback: {
      trigger: interaction.copyFeedback?.trigger || "hover-only",
      hidePolicy: interaction.copyFeedback?.hidePolicy || "pointer-leave",
      placement: interaction.copyFeedback?.placement || "top",
      collision: interaction.copyFeedback?.collision || "shift",
      durationMs: Number(interaction.copyFeedback?.durationMs) || 1200,
    },
  };
}

function designStudioInteractionChanged(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function designStudioOrchestrationStatus(value) {
  const status = displayText(value, "ready");
  if (["blocked", "manual_required", "approval_required", "stale", "failed"].includes(status)) {
    return status;
  }
  if (status === "plan-only" || status === "proposal_only") {
    return "manual_required";
  }
  return "ready";
}

function designStudioContractId(value, t) {
  const id = displayText(value, "");
  return t(`designStudio.contractId.${id}`, displayKey(id));
}

function designStudioFlowStepLabel(value, t) {
  const id = displayText(value, "");
  return t(`designStudio.flowStep.${id}`, displayKey(id));
}

function designStudioSchemaPurpose(schema, t) {
  const id = displayText(schema?.id, "");
  return t(`designStudio.schemaPurpose.${id}`, displayText(schema?.purpose));
}

function designStudioProviderDescription(provider, t) {
  const id = displayText(provider?.id, "");
  return t(`designStudio.providerDetail.${id}`, displayText(provider?.description));
}

function designStudioApplyModeLabel(value, t) {
  const id = displayText(value, "");
  return t(`designStudio.applyMode.${id}`, displayKey(id));
}

function designStudioProductDesignSources(data) {
  const files = asArray(historyRepositoryScope(data).inventory?.files)
    .map((file) => displayText(file.path, ""))
    .filter((path) => path === "ops/DESIGN_SYSTEM_MANIFEST.tsv" || path.startsWith("docs/design-system/"));
  const priority = [
    "docs/design-system/DESIGN_SYSTEM.md",
    "ops/DESIGN_SYSTEM_MANIFEST.tsv",
    "docs/design-system/tokens.json",
    "docs/design-system/components.json",
    "docs/design-system/design-system-contract.json",
  ];
  return [...new Set([...priority.filter((path) => files.includes(path)), ...files])]
    .slice(0, 8)
    .map((path) => `product:${path}`);
}

function DesignStudioRulePreview({ type, t, style }) {
  return (
    <div className="design-studio-rule-preview" data-preview-for={type} style={style}>
      <div className="design-studio-rule-preview__head">
        <Eye aria-hidden="true" size={16} />
        <div>
          <strong>{t("designStudio.itemPreview.title")}</strong>
          <p>{t(`designStudio.itemPreview.${type}.focus`)}</p>
        </div>
      </div>
      {type === "page-header" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--header page-title page-title--overview">
          <div className="page-title__main">
            <span className="page-title__icon">
              <Wrench aria-hidden="true" size={18} />
            </span>
            <div>
              <h2>{t("designStudio.preview.headerTitle")}</h2>
              <p>{t("designStudio.preview.headerDetail")}</p>
            </div>
          </div>
        </div>
      ) : null}
      {type === "controls" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--controls">
          <button type="button">
            <Pencil aria-hidden="true" size={14} />
            {t("designStudio.preview.controlReview")}
          </button>
          <button className="design-studio-action--primary" type="button">
            <Check aria-hidden="true" size={14} />
            {t("designStudio.preview.controlApply")}
          </button>
          <select aria-label={t("designStudio.preview.controlSelect")}>
            <option>{t("designStudio.preview.controlOption")}</option>
          </select>
        </div>
      ) : null}
      {type === "badges" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--badges">
          <StatusPill value="ready" t={t} label={statusLabelForChip("ready", t)} />
          <span className="mode-pill mode-pill--allowed">{t("settingsPage.value.boolean.true")}</span>
        </div>
      ) : null}
      {type === "technical" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--technical">
          <span className="source-boundary__chip design-studio-preview__chip">
            {technicalTooltipValue("product:docs/design-system/DESIGN_SYSTEM.md", t("designStudio.preview.tooltip"), "source-boundary__chip-value")}
            <button className="source-boundary__chip-copy" type="button" aria-label={`${t("app.copyItem")}: product:docs/design-system/DESIGN_SYSTEM.md`} data-copy-tooltip="product:docs/design-system/DESIGN_SYSTEM.md">
              <Copy aria-hidden="true" size={14} />
            </button>
          </span>
        </div>
      ) : null}
      {type === "foundation" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--foundation">
          <span className="design-studio-rule-preview__swatch" />
          <div>
            <strong>{t("designStudio.preview.organismTitle")}</strong>
            <p>{t("designStudio.preview.organismDetail")}</p>
          </div>
        </div>
      ) : null}
      {type === "card-row" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--card-row">
          <article className="workflow-mini-card design-studio-preview__card-density">
            <strong>{t("designStudio.preview.cardTitle")}</strong>
            <p>{t("designStudio.preview.cardDetail")}</p>
          </article>
          <div className="mock-table-row design-studio-preview__row-density">
            <span>{t("designStudio.preview.row")}</span>
            <strong>{t("designStudio.preview.rowTitle")}</strong>
          </div>
        </div>
      ) : null}
      {type === "interactions" ? (
        <div className="design-studio-rule-preview__sample design-studio-rule-preview__sample--interactions">
          <span className="source-boundary__chip design-studio-preview__chip design-studio-rule-preview__interaction-chip">
            {technicalTooltipValue("product:docs/design-system/DESIGN_SYSTEM.md", t("designStudio.preview.tooltip"), "source-boundary__chip-value")}
            <button className="source-boundary__chip-copy" type="button" aria-label={`${t("app.copyItem")}: product:docs/design-system/DESIGN_SYSTEM.md`} data-copy-tooltip="product:docs/design-system/DESIGN_SYSTEM.md">
              <Copy aria-hidden="true" size={14} />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DesignStudioOrchestrationPanel({ t }) {
  const orchestration = dashboardControlCenterDesignSystem.orchestration || {};
  const flowSteps = asArray(orchestration.model);
  const schemas = asArray(orchestration.schemas);
  const providerModes = asArray(orchestration.providerModes);
  const targetAdapters = asArray(orchestration.targetAdapters);
  const store = orchestration.store || {};
  const eventRunner = orchestration.eventRunner || {};
  const mockLibrary = orchestration.mockLibrary || {};
  const templateLibrary = orchestration.templateLibrary || {};
  const headingId = "design-studio-orchestration-heading";

  return (
    <details className="detail-section design-studio-orchestration-panel" id="design-studio-orchestration" aria-labelledby={headingId}>
      <summary className="design-studio-orchestration-panel__summary">
        <span className="design-studio-orchestration-panel__title">
          <Waypoints aria-hidden="true" size={20} />
          <h3 id={headingId}>{t("designStudio.orchestration.title")}</h3>
        </span>
        <span className="design-studio-orchestration-panel__meta">
          <span className="design-studio-orchestration-panel__hint design-studio-orchestration-panel__hint--closed">{t("designStudio.orchestration.show")}</span>
          <span className="design-studio-orchestration-panel__hint design-studio-orchestration-panel__hint--open">{t("designStudio.orchestration.hide")}</span>
          <span className="design-studio-orchestration-panel__indicator" aria-hidden="true" />
        </span>
      </summary>
      <div className="design-studio-orchestration">
        <div className="design-studio-orchestration__intro">
          <StatusPill value="ready" t={t} label={t("designStudio.orchestration.status")} />
          <p>{t("designStudio.orchestration.detail")}</p>
        </div>
        <div className="design-studio-orchestration__flow" aria-label={t("designStudio.orchestration.flowTitle")}>
          {flowSteps.map((step, index) => (
            <div className="design-studio-orchestration__flow-step" key={`${step}-${index}`}>
              <span>{index + 1}</span>
              <strong>{designStudioFlowStepLabel(step, t)}</strong>
            </div>
          ))}
        </div>
        <div className="design-studio-orchestration__cards">
          <article className="design-studio-orchestration__card">
            <div className="design-studio-orchestration__card-head">
              <Database aria-hidden="true" size={18} />
              <h3>{t("designStudio.orchestration.storeTitle")}</h3>
            </div>
            <StatusPill value={designStudioOrchestrationStatus(store.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(store.status), t)} />
            <p>{t("designStudio.orchestration.storeDetail")}</p>
            <small>{t("designStudio.orchestration.storeFields")}</small>
          </article>
          <article className="design-studio-orchestration__card">
            <div className="design-studio-orchestration__card-head">
              <Activity aria-hidden="true" size={18} />
              <h3>{t("designStudio.orchestration.runnerTitle")}</h3>
            </div>
            <StatusPill value={designStudioOrchestrationStatus(eventRunner.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(eventRunner.status), t)} />
            <p>{t("designStudio.orchestration.runnerDetail")}</p>
            <small>{t("designStudio.orchestration.runnerCapabilities")}</small>
          </article>
          <article className="design-studio-orchestration__card">
            <div className="design-studio-orchestration__card-head">
              <Eye aria-hidden="true" size={18} />
              <h3>{t("designStudio.orchestration.mockTitle")}</h3>
            </div>
            <StatusPill value={designStudioOrchestrationStatus(mockLibrary.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(mockLibrary.status), t)} />
            <p>{t("designStudio.orchestration.mockDetail")}</p>
            <small>{t("designStudio.orchestration.mockOperations")}</small>
          </article>
          <article className="design-studio-orchestration__card">
            <div className="design-studio-orchestration__card-head">
              <FileText aria-hidden="true" size={18} />
              <h3>{t("designStudio.orchestration.templateTitle")}</h3>
            </div>
            <StatusPill value={designStudioOrchestrationStatus(templateLibrary.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(templateLibrary.status), t)} />
            <p>{t("designStudio.orchestration.templateDetail")}</p>
            <small>{t("designStudio.orchestration.templateOperations")}</small>
          </article>
        </div>
        <div className="design-studio-contract-table" role="table" aria-label={t("designStudio.orchestration.schemasTitle")}>
          <div className="design-studio-contract-table__head" role="row">
            <span role="columnheader">{t("designStudio.orchestration.schemaColumn")}</span>
            <span role="columnheader">{t("designStudio.orchestration.purposeColumn")}</span>
            <span role="columnheader">{t("designStudio.orchestration.stateColumn")}</span>
          </div>
          {schemas.map((schema) => (
            <div className="design-studio-contract-table__row" role="row" key={schema.id}>
              <strong role="cell">{designStudioContractId(schema.id, t)}</strong>
              <span role="cell">{designStudioSchemaPurpose(schema, t)}</span>
              <span role="cell">
                <StatusPill value={designStudioOrchestrationStatus(schema.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(schema.status), t)} />
              </span>
            </div>
          ))}
        </div>
        <div className="design-studio-orchestration__cards design-studio-orchestration__cards--compact">
          {providerModes.map((provider) => (
            <article className="design-studio-orchestration__card" key={provider.id}>
              <div className="design-studio-orchestration__card-head">
                <Brain aria-hidden="true" size={18} />
                <h3>{designStudioContractId(provider.id, t)}</h3>
              </div>
              <StatusPill value={designStudioOrchestrationStatus(provider.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(provider.status), t)} />
              <p>{designStudioProviderDescription(provider, t)}</p>
              <small>{t("designStudio.orchestration.applyAuthority")}: {provider.directApplyAuthority ? t("designStudio.orchestration.yes") : t("designStudio.orchestration.no")}</small>
            </article>
          ))}
          {targetAdapters.map((target) => (
            <article className="design-studio-orchestration__card" key={target.id}>
              <div className="design-studio-orchestration__card-head">
                <Target aria-hidden="true" size={18} />
                <h3>{designStudioContractId(target.id, t)}</h3>
              </div>
              <StatusPill value={designStudioOrchestrationStatus(target.status)} t={t} label={statusLabelForChip(designStudioOrchestrationStatus(target.status), t)} />
              <p>{t("designStudio.orchestration.targetDetail")}</p>
              <small>{t("designStudio.orchestration.applyMode")}: {designStudioApplyModeLabel(target.applyMode, t)}</small>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}

function designStudioWorkflowState(data) {
  const source = data?.design_studio && typeof data.design_studio === "object" ? data.design_studio : {};
  const summary = source.summary && typeof source.summary === "object" ? source.summary : {};
  const boundaries = {
    writes_allowed: false,
    direct_apply_authority: false,
    external_product_apply: false,
    provider_dispatch: false,
    imagegen_executed: false,
    plan_token_created: false,
    apply_token_created: false,
    approval_receipt_created: false,
    ...(source.boundaries && typeof source.boundaries === "object" ? source.boundaries : {}),
  };
  return {
    status: normalizeState(source.status || "unknown"),
    syncId: displayText(source.sync_id, "dashboard_design_studio_proposal_workflow_foundation"),
    summary,
    events: asArray(source.events),
    imports: asArray(source.imports),
    candidate: source.latest_candidate_review || null,
    proposal: source.latest_proposal_preview || null,
    handoff: source.subscription_agent_handoff || null,
    exportPlan: source.external_product_export || null,
    providerPolicy: {
      provider_mode: "api-key",
      status: "blocked",
      api_call_available: false,
      ...(source.api_key_provider_policy && typeof source.api_key_provider_policy === "object" ? source.api_key_provider_policy : {}),
    },
    transaction: source.owner_tool_transaction_preview || null,
    boundaries,
  };
}

function DesignStudioWorkflowMetric({ label, value }) {
  return (
    <article className="workflow-mini-card">
      <strong>{displayText(value, "0")}</strong>
      <p>{label}</p>
    </article>
  );
}

function DesignStudioProposalWorkflowPanel({ data, t }) {
  const workflow = designStudioWorkflowState(data);
  const summaryItems = [
    [t("designStudio.proposalWorkflow.events"), workflow.summary.event_count ?? workflow.events.length],
    [t("designStudio.proposalWorkflow.imports"), workflow.summary.import_count ?? workflow.imports.length],
    [t("designStudio.proposalWorkflow.candidates"), workflow.summary.candidate_count ?? 0],
    [t("designStudio.proposalWorkflow.proposals"), workflow.summary.proposal_count ?? 0],
  ];
  const candidate = workflow.candidate;
  const proposal = workflow.proposal;
  const providerPolicy = workflow.providerPolicy || {};
  const exportPlan = workflow.exportPlan || {};
  const transaction = workflow.transaction || {};
  const handoff = workflow.handoff || {};
  const boundaryRows = [
    ["provider_dispatch", t("designStudio.proposalWorkflow.noProviderDispatch")],
    ["imagegen_executed", t("designStudio.proposalWorkflow.noImagegenExecution")],
    ["external_product_apply", t("designStudio.proposalWorkflow.noProductWrite")],
    ["direct_apply_authority", t("designStudio.proposalWorkflow.noDirectApply")],
    ["plan_token_created", t("designStudio.proposalWorkflow.noPlanToken")],
    ["apply_token_created", t("designStudio.proposalWorkflow.noApplyToken")],
    ["approval_receipt_created", t("designStudio.proposalWorkflow.noApprovalReceipt")],
  ];

  return (
    <DetailSection id="design-studio-proposal-workflow" title={t("designStudio.proposalWorkflow.title")} Icon={ListChecks}>
      <div className="design-studio-orchestration__intro">
        <StatusPill value={workflow.status} t={t} label={statusLabelForChip(workflow.status, t)} />
        <p>{displayText(workflow.summary.next_action, t("designStudio.proposalWorkflow.detail"))}</p>
        <small>{t("designStudio.proposalWorkflow.syncId")}: {technicalChip(workflow.syncId)}</small>
      </div>
      <div className="design-studio-orchestration__cards">
        {summaryItems.map(([label, value]) => (
          <DesignStudioWorkflowMetric key={label} label={label} value={value} />
        ))}
      </div>
      {!workflow.imports.length ? (
        <p className="summary-empty-state">{t("designStudio.proposalWorkflow.noImports")}</p>
      ) : null}
      <div className="design-studio-orchestration__cards design-studio-orchestration__cards--compact">
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <Eye aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.latestCandidate")}</h3>
          </div>
          {candidate ? (
            <>
              <StatusPill value={candidate.decision_gate?.status || "manual_required"} t={t} label={t("designStudio.proposalWorkflow.manualDecision")} />
              <p>{t("designStudio.proposalWorkflow.sourceKind")}: {displayText(candidate.source_kind)}</p>
              <small>{t("designStudio.proposalWorkflow.confidence")}: {displayText(candidate.confidence)}</small>
              <small>{t("designStudio.proposalWorkflow.instructionBoundary")}: {displayText(candidate.instruction_denial)}</small>
            </>
          ) : (
            <p>{t("designStudio.proposalWorkflow.noCandidate")}</p>
          )}
        </article>
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <FileCheck2 aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.latestProposal")}</h3>
          </div>
          {proposal ? (
            <>
              <StatusPill value={proposal.decision_gate?.status || "manual_required"} t={t} label={t("designStudio.proposalWorkflow.manualDecision")} />
              <p>{t("designStudio.proposalWorkflow.operationCount")}: {displayText(proposal.operation_count, "0")}</p>
              <small>{t("designStudio.proposalWorkflow.risk")}: {displayText(proposal.risk_assessment)}</small>
              <small>{t("designStudio.proposalWorkflow.confidence")}: {displayText(proposal.confidence)}</small>
              <SourceBoundaryChips values={proposal.affected_source_files} t={t} limit={3} variant="files" labelKey="maintenance.sourceFileItem" tooltipKey="maintenance.sourceFileTooltip" />
              <SourceBoundaryChips values={proposal.check_plan} t={t} limit={3} variant="commands" labelKey="maintenance.sourceCommandItem" tooltipKey="maintenance.sourceCommandTooltip" />
            </>
          ) : (
            <p>{t("designStudio.proposalWorkflow.noProposal")}</p>
          )}
        </article>
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <Brain aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.handoffTitle")}</h3>
          </div>
          <StatusPill value={handoff.event_id ? "manual_required" : "unknown"} t={t} label={handoff.event_id ? t("designStudio.proposalWorkflow.manualImport") : statusLabelForChip("unknown", t)} />
          <p>{displayText(handoff.next_action, t("designStudio.proposalWorkflow.handoffDetail"))}</p>
          <small>{t("designStudio.proposalWorkflow.responseContracts")}: {asArray(handoff.response_contracts).map((contract) => displayText(contract.schema_id, "")).filter(Boolean).join(", ") || t("summary.none")}</small>
          {asArray(handoff.import_commands).length ? <SourceBoundaryChips values={handoff.import_commands} t={t} limit={2} variant="commands" labelKey="maintenance.sourceCommandItem" tooltipKey="maintenance.sourceCommandTooltip" /> : null}
        </article>
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <KeyRound aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.providerTitle")}</h3>
          </div>
          <StatusPill value={providerPolicy.status || "blocked"} t={t} label={statusLabelForChip(providerPolicy.status || "blocked", t)} />
          <p>{t("designStudio.proposalWorkflow.providerDetail")}</p>
          <small>{t("designStudio.proposalWorkflow.apiCallAvailable")}: {providerPolicy.api_call_available === true ? t("designStudio.orchestration.yes") : t("designStudio.orchestration.no")}</small>
          <small>{asArray(providerPolicy.required_before_enablement).slice(0, 4).map((item) => displayKey(item)).join(", ") || t("designStudio.proposalWorkflow.blockedUntilPolicy")}</small>
        </article>
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <ExternalLink aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.exportTitle")}</h3>
          </div>
          <StatusPill value={exportPlan.target_apply_mode === "plan-only" ? "manual_required" : "unknown"} t={t} label={t("designStudio.proposalWorkflow.planOnly")} />
          <p>{displayText(exportPlan.next_action, t("designStudio.proposalWorkflow.exportDetail"))}</p>
          <small>{t("designStudio.orchestration.applyMode")}: {displayText(exportPlan.target_apply_mode, "plan-only")}</small>
        </article>
        <article className="design-studio-orchestration__card">
          <div className="design-studio-orchestration__card-head">
            <ClipboardCheck aria-hidden="true" size={18} />
            <h3>{t("designStudio.proposalWorkflow.transactionTitle")}</h3>
          </div>
          <StatusPill value={transaction.dry_run ? "manual_required" : "unknown"} t={t} label={transaction.dry_run ? t("designStudio.proposalWorkflow.dryRun") : statusLabelForChip("unknown", t)} />
          <p>{displayText(transaction.next_action, t("designStudio.proposalWorkflow.transactionDetail"))}</p>
          <small>{t("designStudio.proposalWorkflow.requiredBeforeApply")}: {asArray(transaction.required_before_apply).slice(0, 4).map((item) => displayKey(item)).join(", ") || t("summary.none")}</small>
        </article>
      </div>
      <div className="design-studio-orchestration__flow" aria-label={t("designStudio.proposalWorkflow.boundaryTitle")}>
        {boundaryRows.map(([key, label]) => (
          <div className="design-studio-orchestration__flow-step" key={key}>
            <StatusPill value={workflow.boundaries[key] === false ? "ready" : "blocked"} t={t} label={workflow.boundaries[key] === false ? label : statusLabelForChip("blocked", t)} />
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

function DesignStudioPage({ data, locale, t }) {
  const tooltipComponent = designStudioComponentById("tooltip-copy");
  const sourceInteraction = useMemo(() => designStudioInteraction(tooltipComponent), [tooltipComponent]);
  const [draftInteraction, setDraftInteraction] = useState(sourceInteraction);
  const [confirmed, setConfirmed] = useState(false);
  const [planToken, setPlanToken] = useState("");
  const [mutationState, setMutationState] = useState({ status: "idle", result: null, error: null });
  const componentCount = dashboardControlCenterDesignSystem.components.length;
  const tokenCount = dashboardControlCenterDesignSystem.tokens.length;
  const hasDraftChanges = designStudioInteractionChanged(sourceInteraction, draftInteraction);
  const updateTooltip = (updates) => {
    setDraftInteraction((previous) => ({ ...previous, tooltip: { ...previous.tooltip, ...updates } }));
    setConfirmed(false);
    setPlanToken("");
    setMutationState({ status: "idle", result: null, error: null });
  };
  const updateFoundation = (updates) => {
    setDraftInteraction((previous) => ({ ...previous, foundation: { ...previous.foundation, ...updates } }));
    setConfirmed(false);
    setPlanToken("");
    setMutationState({ status: "idle", result: null, error: null });
  };
  const updateCopyFeedback = (updates) => {
    setDraftInteraction((previous) => ({ ...previous, copyFeedback: { ...previous.copyFeedback, ...updates } }));
    setConfirmed(false);
    setPlanToken("");
    setMutationState({ status: "idle", result: null, error: null });
  };
  const resetDraft = () => {
    setDraftInteraction(sourceInteraction);
    setConfirmed(false);
    setPlanToken("");
    setMutationState({ status: "idle", result: null, error: null });
  };
  const handlePlan = async () => {
    setConfirmed(false);
    setPlanToken("");
    setMutationState({ status: "planning", result: null, error: null });
    try {
      const result = await planDashboardDesignSystemChange(draftInteraction);
      setPlanToken(displayText(result.plan_token, ""));
      setMutationState({ status: "planned", result, error: null });
    } catch (error) {
      setMutationState({ status: "error", result: null, error });
    }
  };
  const handleApply = async () => {
    if (!confirmed || mutationState.status !== "planned" || !planToken) {
      return;
    }
    setMutationState((previous) => ({ ...previous, status: "applying", error: null }));
    setConfirmed(false);
    try {
      const result = await applyDashboardDesignSystemChange(draftInteraction, planToken);
      setPlanToken("");
      setMutationState({ status: "applied", result, error: null });
    } catch (error) {
      setPlanToken("");
      setMutationState((previous) => ({ ...previous, status: "error", error }));
    }
  };
  const draftTheme = DESIGN_STUDIO_FOUNDATION_PRESETS.themeAccent[draftInteraction.foundation.themeAccent] || DESIGN_STUDIO_FOUNDATION_PRESETS.themeAccent.blue;
  const draftDensity = DESIGN_STUDIO_FOUNDATION_PRESETS.density[draftInteraction.foundation.density] || DESIGN_STUDIO_FOUNDATION_PRESETS.density.balanced;
  const draftRadius = DESIGN_STUDIO_FOUNDATION_PRESETS.radiusScale[draftInteraction.foundation.radiusScale] || DESIGN_STUDIO_FOUNDATION_PRESETS.radiusScale.standard;
  const draftTypography = DESIGN_STUDIO_FOUNDATION_PRESETS.typographyScale[draftInteraction.foundation.typographyScale] || DESIGN_STUDIO_FOUNDATION_PRESETS.typographyScale.standard;
  const previewStyle = {
    "--dcc-tooltip-max-width": draftInteraction.tooltip.maxWidth,
    "--dcc-page-accent-fallback": draftTheme.pageAccent,
    "--dcc-page-soft-fallback": draftTheme.pageSoft,
    "--dcc-page-border-fallback": draftTheme.pageBorder,
    "--dcc-section-gap": draftDensity.sectionGap,
    "--dcc-panel-padding": draftDensity.panelPadding,
    "--dcc-control-gap": draftDensity.controlGap,
    "--dcc-radius": draftRadius.radius,
    "--dcc-font-size-body": draftTypography.body,
    "--dcc-font-size-section-title": draftTypography.sectionTitle,
    "--dcc-font-size-page-title": draftTypography.pageTitle,
    "--dcc-action-control-height": draftInteraction.foundation.actionControlHeight,
    "--dcc-action-control-padding": draftInteraction.foundation.actionControlPadding,
    "--dcc-compact-control-height": draftInteraction.foundation.compactControlHeight,
    "--dcc-compact-control-padding": draftInteraction.foundation.compactControlPadding,
    "--dcc-form-control-height": draftInteraction.foundation.formControlHeight,
    "--dcc-form-control-padding": draftInteraction.foundation.formControlPadding,
    "--dcc-icon-button-size": draftInteraction.foundation.iconButtonSize,
    "--dcc-control-font-size": draftInteraction.foundation.controlFontSize,
    "--dcc-card-padding": draftInteraction.foundation.cardPadding,
    "--dcc-card-gap": draftInteraction.foundation.cardGap,
    "--dcc-row-padding": draftInteraction.foundation.rowPadding,
    "--dcc-row-gap": draftInteraction.foundation.rowGap,
    "--dcc-technical-affordance-gap": draftInteraction.foundation.technicalAffordanceGap,
    "--dcc-technical-source-max-width": draftInteraction.foundation.technicalSourceMaxWidth,
    "--dcc-technical-evidence-max-width": draftInteraction.foundation.technicalEvidenceMaxWidth,
    "--dcc-technical-preview-chip-max-width": draftInteraction.foundation.technicalPreviewChipMaxWidth,
    "--dcc-page-header-padding": draftInteraction.foundation.pageHeaderPadding,
    "--dcc-metadata-gap": draftInteraction.foundation.metadataGap,
    "--dcc-page-icon-size": draftInteraction.foundation.pageIconSize,
    "--dcc-badge-gap": draftInteraction.foundation.badgeGap,
    "--dcc-badge-height": draftInteraction.foundation.badgeHeight,
    "--dcc-mode-badge-padding": draftInteraction.foundation.modeBadgePadding,
    "--dcc-badge-font-size": draftInteraction.foundation.badgeFontSize,
    "--dcc-mode-badge-font-size": draftInteraction.foundation.modeBadgeFontSize,
  };
  const context = selectedContextData(data);
  const selectedRepository = repositoryDisplayName(context.target_repository?.name || historyRepositoryScope(data).repository_name, t);
  const productDesignSources = designStudioProductDesignSources(data);
  const productDesignStatus = productDesignSources.length ? "manual_required" : "unknown";

  return (
    <section className="view-surface view-surface--design-studio sidebar-page" id="design-studio" aria-labelledby="design-studio-heading">
      <DetailPageHeader tone="design-studio" Icon={Wrench} title={t("designStudio.title")} subtitle={t("designStudio.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="design-studio-heading" />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: FileText, label: t("designStudio.summary.source"), value: "DESIGN_SYSTEM.md", detail: t("designStudio.summary.sourceDetail") },
          { Icon: FileJson, label: t("designStudio.summary.machine"), value: `${tokenCount} ${t("designStudio.summary.tokens")} / ${componentCount} ${t("designStudio.summary.components")}`, detail: t("designStudio.summary.machineDetail") },
          { Icon: Eye, label: t("designStudio.summary.preview"), value: t("designStudio.summary.previewValue"), detail: t("designStudio.summary.previewDetail"), tone: "ready" },
          { Icon: Lock, label: t("designStudio.summary.boundary"), value: t("designStudio.summary.boundaryValue"), detail: t("designStudio.summary.boundaryDetail"), tone: "warning" },
        ]}
      />
      <DetailSection id="design-studio-targets" title={t("designStudio.targetsTitle")} Icon={GitBranch}>
        <div className="design-studio-target-grid">
          <article className="design-studio-target-card design-studio-target-card--active" data-design-target="dashboard-control-center">
            <StatusPill value="ready" t={t} label={t("designStudio.target.dashboard.status")} />
            <h3>{t("designStudio.target.dashboard.title")}</h3>
            <p>{t("designStudio.target.dashboard.detail")}</p>
          </article>
          <article className="design-studio-target-card" data-design-target="external-product">
            <StatusPill value={productDesignStatus} t={t} label={t("designStudio.target.product.status")} />
            <h3>{t("designStudio.target.product.title")}</h3>
            <p>{t("designStudio.target.product.detail")}</p>
            <div className="design-studio-target-card__sources">
              <strong>{t("designStudio.target.product.sourceTitle")}: {selectedRepository}</strong>
              {productDesignSources.length ? (
                <SourceBoundaryChips values={productDesignSources} t={t} limit={5} variant="files" labelKey="maintenance.sourceFileItem" tooltipKey="maintenance.sourceFileTooltip" />
              ) : (
                <small>{t("designStudio.target.product.noSources")}</small>
              )}
              <small>{t("designStudio.target.product.planOnly")}</small>
            </div>
          </article>
        </div>
      </DetailSection>
      <DesignStudioOrchestrationPanel t={t} />
      <DesignStudioProposalWorkflowPanel data={data} t={t} />
      <DetailSection id="design-studio-interactions" title={t("designStudio.interactionsTitle")} Icon={Wrench}>
        <div className="design-studio-grid">
          <article className="design-studio-editor">
            <div className="design-studio-editor__head">
              <span className="design-studio-editor__icon">
                <Info aria-hidden="true" size={20} />
              </span>
              <div>
                <h3>{t("designStudio.tooltipCopy.title")}</h3>
                <p>{t("designStudio.tooltipCopy.detail")}</p>
              </div>
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.foundationTitle")}</h4>
              <p>{t("designStudio.foundationDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.themeAccent")}</span>
                  <select value={draftInteraction.foundation.themeAccent} onChange={(event) => updateFoundation({ themeAccent: event.target.value })}>
                    {DESIGN_STUDIO_THEME_OPTIONS.map((value) => (
                      <option value={value} key={value}>{t(`designStudio.value.theme.${value}`)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.density")}</span>
                  <select value={draftInteraction.foundation.density} onChange={(event) => updateFoundation({ density: event.target.value })}>
                    {DESIGN_STUDIO_DENSITY_OPTIONS.map((value) => (
                      <option value={value} key={value}>{t(`designStudio.value.density.${value}`)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.radiusScale")}</span>
                  <select value={draftInteraction.foundation.radiusScale} onChange={(event) => updateFoundation({ radiusScale: event.target.value })}>
                    {DESIGN_STUDIO_RADIUS_OPTIONS.map((value) => (
                      <option value={value} key={value}>{t(`designStudio.value.radius.${value}`)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.typographyScale")}</span>
                  <select value={draftInteraction.foundation.typographyScale} onChange={(event) => updateFoundation({ typographyScale: event.target.value })}>
                    {DESIGN_STUDIO_TYPOGRAPHY_OPTIONS.map((value) => (
                      <option value={value} key={value}>{t(`designStudio.value.typography.${value}`)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="foundation" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.technicalLayoutTitle")}</h4>
              <p>{t("designStudio.technicalLayoutDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.technicalAffordanceGap")}</span>
                  <select value={draftInteraction.foundation.technicalAffordanceGap} onChange={(event) => updateFoundation({ technicalAffordanceGap: event.target.value })}>
                    {DESIGN_STUDIO_TECHNICAL_GAP_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.technicalSourceMaxWidth")}</span>
                  <select value={draftInteraction.foundation.technicalSourceMaxWidth} onChange={(event) => updateFoundation({ technicalSourceMaxWidth: event.target.value })}>
                    {DESIGN_STUDIO_SOURCE_WIDTH_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.technicalEvidenceMaxWidth")}</span>
                  <select value={draftInteraction.foundation.technicalEvidenceMaxWidth} onChange={(event) => updateFoundation({ technicalEvidenceMaxWidth: event.target.value })}>
                    {DESIGN_STUDIO_EVIDENCE_WIDTH_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.technicalPreviewChipMaxWidth")}</span>
                  <select value={draftInteraction.foundation.technicalPreviewChipMaxWidth} onChange={(event) => updateFoundation({ technicalPreviewChipMaxWidth: event.target.value })}>
                    {DESIGN_STUDIO_PREVIEW_WIDTH_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="technical" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.pageHeaderLayoutTitle")}</h4>
              <p>{t("designStudio.pageHeaderLayoutDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.pageHeaderPadding")}</span>
                  <select value={draftInteraction.foundation.pageHeaderPadding} onChange={(event) => updateFoundation({ pageHeaderPadding: event.target.value })}>
                    {DESIGN_STUDIO_PAGE_HEADER_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.metadataGap")}</span>
                  <select value={draftInteraction.foundation.metadataGap} onChange={(event) => updateFoundation({ metadataGap: event.target.value })}>
                    {DESIGN_STUDIO_METADATA_GAP_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.pageIconSize")}</span>
                  <select value={draftInteraction.foundation.pageIconSize} onChange={(event) => updateFoundation({ pageIconSize: event.target.value })}>
                    {DESIGN_STUDIO_PAGE_ICON_SIZE_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="page-header" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.controlLayoutTitle")}</h4>
              <p>{t("designStudio.controlLayoutDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.actionControlHeight")}</span>
                  <select value={draftInteraction.foundation.actionControlHeight} onChange={(event) => updateFoundation({ actionControlHeight: event.target.value })}>
                    {DESIGN_STUDIO_ACTION_CONTROL_HEIGHT_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.actionControlPadding")}</span>
                  <select value={draftInteraction.foundation.actionControlPadding} onChange={(event) => updateFoundation({ actionControlPadding: event.target.value })}>
                    {DESIGN_STUDIO_ACTION_CONTROL_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.compactControlHeight")}</span>
                  <select value={draftInteraction.foundation.compactControlHeight} onChange={(event) => updateFoundation({ compactControlHeight: event.target.value })}>
                    {DESIGN_STUDIO_COMPACT_CONTROL_HEIGHT_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.compactControlPadding")}</span>
                  <select value={draftInteraction.foundation.compactControlPadding} onChange={(event) => updateFoundation({ compactControlPadding: event.target.value })}>
                    {DESIGN_STUDIO_COMPACT_CONTROL_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.formControlHeight")}</span>
                  <select value={draftInteraction.foundation.formControlHeight} onChange={(event) => updateFoundation({ formControlHeight: event.target.value })}>
                    {DESIGN_STUDIO_FORM_CONTROL_HEIGHT_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.formControlPadding")}</span>
                  <select value={draftInteraction.foundation.formControlPadding} onChange={(event) => updateFoundation({ formControlPadding: event.target.value })}>
                    {DESIGN_STUDIO_FORM_CONTROL_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.iconButtonSize")}</span>
                  <select value={draftInteraction.foundation.iconButtonSize} onChange={(event) => updateFoundation({ iconButtonSize: event.target.value })}>
                    {DESIGN_STUDIO_ICON_BUTTON_SIZE_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.controlFontSize")}</span>
                  <select value={draftInteraction.foundation.controlFontSize} onChange={(event) => updateFoundation({ controlFontSize: event.target.value })}>
                    {DESIGN_STUDIO_CONTROL_FONT_SIZE_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="controls" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.cardRowLayoutTitle")}</h4>
              <p>{t("designStudio.cardRowLayoutDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.cardPadding")}</span>
                  <select value={draftInteraction.foundation.cardPadding} onChange={(event) => updateFoundation({ cardPadding: event.target.value })}>
                    {DESIGN_STUDIO_CARD_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.cardGap")}</span>
                  <select value={draftInteraction.foundation.cardGap} onChange={(event) => updateFoundation({ cardGap: event.target.value })}>
                    {DESIGN_STUDIO_CARD_GAP_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.rowPadding")}</span>
                  <select value={draftInteraction.foundation.rowPadding} onChange={(event) => updateFoundation({ rowPadding: event.target.value })}>
                    {DESIGN_STUDIO_ROW_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.rowGap")}</span>
                  <select value={draftInteraction.foundation.rowGap} onChange={(event) => updateFoundation({ rowGap: event.target.value })}>
                    {DESIGN_STUDIO_ROW_GAP_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="card-row" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.badgeLayoutTitle")}</h4>
              <p>{t("designStudio.badgeLayoutDetail")}</p>
              <div className="design-studio-form-grid design-studio-foundation-grid">
                <label>
                  <span>{t("designStudio.field.badgeGap")}</span>
                  <select value={draftInteraction.foundation.badgeGap} onChange={(event) => updateFoundation({ badgeGap: event.target.value })}>
                    {DESIGN_STUDIO_BADGE_GAP_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.badgeHeight")}</span>
                  <select value={draftInteraction.foundation.badgeHeight} onChange={(event) => updateFoundation({ badgeHeight: event.target.value })}>
                    {DESIGN_STUDIO_BADGE_HEIGHT_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.modeBadgePadding")}</span>
                  <select value={draftInteraction.foundation.modeBadgePadding} onChange={(event) => updateFoundation({ modeBadgePadding: event.target.value })}>
                    {DESIGN_STUDIO_MODE_BADGE_PADDING_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.badgeFontSize")}</span>
                  <select value={draftInteraction.foundation.badgeFontSize} onChange={(event) => updateFoundation({ badgeFontSize: event.target.value })}>
                    {DESIGN_STUDIO_BADGE_FONT_SIZE_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("designStudio.field.modeBadgeFontSize")}</span>
                  <select value={draftInteraction.foundation.modeBadgeFontSize} onChange={(event) => updateFoundation({ modeBadgeFontSize: event.target.value })}>
                    {DESIGN_STUDIO_MODE_BADGE_FONT_SIZE_OPTIONS.map((value) => (
                      <option value={value} key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <DesignStudioRulePreview type="badges" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-subsection">
              <h4>{t("designStudio.interactionPresetTitle")}</h4>
              <p>{t("designStudio.interactionPresetDetail")}</p>
              <div className="design-studio-interaction-groups">
                <section className="design-studio-interaction-group" aria-label={t("designStudio.fileTooltip.title")}>
                  <h5>{t("designStudio.fileTooltip.title")}</h5>
                  <p>{t("designStudio.fileTooltip.detail")}</p>
                  <div className="design-studio-form-grid">
                    <label>
                      <span>{t("designStudio.field.fileTooltipTrigger")}</span>
                      <select value={draftInteraction.tooltip.trigger} onChange={(event) => updateTooltip({ trigger: event.target.value })}>
                        {DESIGN_STUDIO_DISPLAY_CONDITION_OPTIONS.map((value) => (
                          <option value={value} key={value}>{t(`designStudio.value.display.${value}`)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.fileTooltipHidePolicy")}</span>
                      <select value={draftInteraction.tooltip.hidePolicy} onChange={(event) => updateTooltip({ hidePolicy: event.target.value })}>
                        <option value="pointer-leave">{t("designStudio.value.pointerLeave")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.fileTooltipPlacement")}</span>
                      <select value={draftInteraction.tooltip.placement} onChange={(event) => updateTooltip({ placement: event.target.value })}>
                        <option value="top">{t("designStudio.value.top")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.fileTooltipMaxWidth")}</span>
                      <select value={draftInteraction.tooltip.maxWidth} onChange={(event) => updateTooltip({ maxWidth: event.target.value })}>
                        {DESIGN_STUDIO_TOOLTIP_WIDTH_OPTIONS.map((value) => (
                          <option value={value} key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
                <section className="design-studio-interaction-group" aria-label={t("designStudio.copyPopup.title")}>
                  <h5>{t("designStudio.copyPopup.title")}</h5>
                  <p>{t("designStudio.copyPopup.detail")}</p>
                  <div className="design-studio-form-grid">
                    <label>
                      <span>{t("designStudio.field.copyTrigger")}</span>
                      <select value={draftInteraction.copyFeedback.trigger} onChange={(event) => updateCopyFeedback({ trigger: event.target.value })}>
                        {DESIGN_STUDIO_DISPLAY_CONDITION_OPTIONS.map((value) => (
                          <option value={value} key={value}>{t(`designStudio.value.display.${value}`)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.copyHidePolicy")}</span>
                      <select value={draftInteraction.copyFeedback.hidePolicy} onChange={(event) => updateCopyFeedback({ hidePolicy: event.target.value })}>
                        <option value="pointer-leave">{t("designStudio.value.pointerLeave")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.copyPlacement")}</span>
                      <select value={draftInteraction.copyFeedback.placement} onChange={(event) => updateCopyFeedback({ placement: event.target.value })}>
                        <option value="top">{t("designStudio.value.top")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("designStudio.field.copyDuration")}</span>
                      <select value={draftInteraction.copyFeedback.durationMs} onChange={(event) => updateCopyFeedback({ durationMs: Number(event.target.value) })}>
                        {DESIGN_STUDIO_COPY_DURATION_OPTIONS.map((value) => (
                          <option value={value} key={value}>{value}ms</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              </div>
              <DesignStudioRulePreview type="interactions" t={t} style={previewStyle} />
            </div>
            <div className="design-studio-action-row">
              <button type="button" onClick={resetDraft} disabled={!hasDraftChanges && mutationState.status !== "planned"}>
                <RefreshCw aria-hidden="true" size={16} />
                {t("designStudio.action.reset")}
              </button>
              <button type="button" onClick={handlePlan} disabled={mutationState.status === "planning" || mutationState.status === "applying"}>
                <Pencil aria-hidden="true" size={16} />
                {mutationState.status === "planning" ? t("designStudio.action.planning") : t("designStudio.action.plan")}
              </button>
            </div>
            <label className="design-studio-confirm-row">
              <input type="checkbox" checked={confirmed} disabled={mutationState.status !== "planned"} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>{t("designStudio.action.confirm")}</span>
            </label>
            <div className="design-studio-action-row">
              <button className="design-studio-action--primary" type="button" onClick={handleApply} disabled={!confirmed || mutationState.status !== "planned" || !planToken}>
                <Check aria-hidden="true" size={16} />
                {mutationState.status === "applying" ? t("designStudio.action.applying") : t("designStudio.action.apply")}
              </button>
            </div>
            {mutationState.result ? (
              <div className={`design-studio-result design-studio-result--${mutationState.status === "applied" ? "applied" : "planned"}`} role="status">
                <StatusPill value={mutationState.status === "applied" ? "passed" : "ready"} t={t} label={mutationState.status === "applied" ? t("designStudio.result.appliedShort") : t("designStudio.result.plannedShort")} />
                <p>{t(displayText(mutationState.result.reason_key, ""), t("designStudio.result.planned"))}</p>
                <small>{t("designStudio.result.target")}: {displayText(mutationState.result.target_file)}</small>
                <details>
                  <summary>{t("designStudio.result.technicalDetails")}</summary>
                  <code>{displayText(mutationState.result.tool_command)}</code>
                </details>
              </div>
            ) : null}
            {mutationState.error ? (
              <div className="design-studio-result design-studio-result--error" role="alert">
                <StatusPill value="failed" t={t} label={statusLabelForChip("failed", t)} />
                <p>{displayText(mutationState.error.message, t("designStudio.result.failed"))}</p>
              </div>
            ) : null}
          </article>
          <article className="design-studio-preview">
            <div className="design-studio-preview__head">
              <Eye aria-hidden="true" size={20} />
              <div>
                <h3>{t("designStudio.preview.title")}</h3>
                <p>{t("designStudio.preview.detail")}</p>
              </div>
            </div>
            <div className="design-studio-preview__surface" style={previewStyle}>
              <div className="design-studio-preview__sample design-studio-preview__sample--header page-title page-title--overview">
                <div className="page-title__main">
                  <span className="page-title__icon">
                    <Wrench aria-hidden="true" size={22} />
                  </span>
                  <div>
                    <h2>{t("designStudio.preview.headerTitle")}</h2>
                    <p>{t("designStudio.preview.headerDetail")}</p>
                  </div>
                </div>
                <div className="page-title__meta">
                  <span>{t("designStudio.preview.headerMetaOne")}</span>
                  <span>{t("designStudio.preview.headerMetaTwo")}</span>
                </div>
              </div>
              <div className="design-studio-preview__sample design-studio-preview__sample--organism">
                <div className="design-studio-preview__sample-icon">
                  <Wrench aria-hidden="true" size={18} />
                </div>
                <div>
                  <span>{t("designStudio.preview.organism")}</span>
                  <strong>{t("designStudio.preview.organismTitle")}</strong>
                  <p>{t("designStudio.preview.organismDetail")}</p>
                </div>
              </div>
              <div className="design-studio-preview__sample design-studio-preview__sample--card-row">
                <article className="workflow-mini-card design-studio-preview__card-density">
                  <span className="design-studio-preview__badge">{t("designStudio.preview.card")}</span>
                  <strong>{t("designStudio.preview.cardTitle")}</strong>
                  <p>{t("designStudio.preview.cardDetail")}</p>
                </article>
                <div className="mock-table-row design-studio-preview__row-density">
                  <span>{t("designStudio.preview.row")}</span>
                  <strong>{t("designStudio.preview.rowTitle")}</strong>
                  <StatusPill value="ready" t={t} label={statusLabelForChip("ready", t)} />
                </div>
              </div>
              <div className="design-studio-preview__sample design-studio-preview__sample--controls">
                <div className="design-studio-action-row">
                  <button type="button">
                    <Pencil aria-hidden="true" size={15} />
                    {t("designStudio.preview.controlReview")}
                  </button>
                  <button className="design-studio-action--primary" type="button">
                    <Check aria-hidden="true" size={15} />
                    {t("designStudio.preview.controlApply")}
                  </button>
                </div>
                <label className="design-studio-preview__control-field">
                  <span>{t("designStudio.preview.controlSelect")}</span>
                  <select aria-label={t("designStudio.preview.controlSelect")}>
                    <option>{t("designStudio.preview.controlOption")}</option>
                  </select>
                </label>
                <button className="settings-modal__close" type="button" aria-label={t("designStudio.preview.controlIcon")}>
                  <CircleX aria-hidden="true" size={16} />
                </button>
              </div>
              <div className="design-studio-preview__sample design-studio-preview__sample--molecule">
                <span className="design-studio-preview__badge">{t("designStudio.preview.atom")}</span>
                <StatusPill value="ready" t={t} label={statusLabelForChip("ready", t)} />
                <span className="mode-pill mode-pill--allowed">{t("settingsPage.value.boolean.true")}</span>
                <span className="source-boundary__chip design-studio-preview__chip">
                  {technicalTooltipValue("docs/workflow/DASHBOARD_DATA_SCHEMA.tsv", t("designStudio.preview.tooltip"), "source-boundary__chip-value")}
                  <button className="source-boundary__chip-copy" type="button" aria-label={`${t("app.copyItem")}: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`} data-copy-tooltip="docs/workflow/DASHBOARD_DATA_SCHEMA.tsv">
                    <Copy aria-hidden="true" size={14} />
                  </button>
                </span>
              </div>
            </div>
            <details className="design-studio-diff">
              <summary>
                <span className="design-studio-diff__title">{t("designStudio.diff.title")}</span>
                <span className="design-studio-diff__meta">
                  <span className="design-studio-diff__hint design-studio-diff__hint--closed">{t("designStudio.diff.showAll")}</span>
                  <span className="design-studio-diff__hint design-studio-diff__hint--open">{t("designStudio.diff.hide")}</span>
                  <span className="design-studio-diff__indicator" aria-hidden="true" />
                </span>
              </summary>
              <dl>
                <div>
                  <dt>{t("designStudio.field.themeAccent")}</dt>
                  <dd>{t(`designStudio.value.theme.${sourceInteraction.foundation.themeAccent}`)}{" -> "}{t(`designStudio.value.theme.${draftInteraction.foundation.themeAccent}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.density")}</dt>
                  <dd>{t(`designStudio.value.density.${sourceInteraction.foundation.density}`)}{" -> "}{t(`designStudio.value.density.${draftInteraction.foundation.density}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.radiusScale")}</dt>
                  <dd>{t(`designStudio.value.radius.${sourceInteraction.foundation.radiusScale}`)}{" -> "}{t(`designStudio.value.radius.${draftInteraction.foundation.radiusScale}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.typographyScale")}</dt>
                  <dd>{t(`designStudio.value.typography.${sourceInteraction.foundation.typographyScale}`)}{" -> "}{t(`designStudio.value.typography.${draftInteraction.foundation.typographyScale}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.actionControlHeight")}</dt>
                  <dd>{sourceInteraction.foundation.actionControlHeight}{" -> "}{draftInteraction.foundation.actionControlHeight}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.actionControlPadding")}</dt>
                  <dd>{sourceInteraction.foundation.actionControlPadding}{" -> "}{draftInteraction.foundation.actionControlPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.compactControlHeight")}</dt>
                  <dd>{sourceInteraction.foundation.compactControlHeight}{" -> "}{draftInteraction.foundation.compactControlHeight}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.compactControlPadding")}</dt>
                  <dd>{sourceInteraction.foundation.compactControlPadding}{" -> "}{draftInteraction.foundation.compactControlPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.formControlHeight")}</dt>
                  <dd>{sourceInteraction.foundation.formControlHeight}{" -> "}{draftInteraction.foundation.formControlHeight}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.formControlPadding")}</dt>
                  <dd>{sourceInteraction.foundation.formControlPadding}{" -> "}{draftInteraction.foundation.formControlPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.iconButtonSize")}</dt>
                  <dd>{sourceInteraction.foundation.iconButtonSize}{" -> "}{draftInteraction.foundation.iconButtonSize}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.controlFontSize")}</dt>
                  <dd>{sourceInteraction.foundation.controlFontSize}{" -> "}{draftInteraction.foundation.controlFontSize}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.cardPadding")}</dt>
                  <dd>{sourceInteraction.foundation.cardPadding}{" -> "}{draftInteraction.foundation.cardPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.cardGap")}</dt>
                  <dd>{sourceInteraction.foundation.cardGap}{" -> "}{draftInteraction.foundation.cardGap}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.rowPadding")}</dt>
                  <dd>{sourceInteraction.foundation.rowPadding}{" -> "}{draftInteraction.foundation.rowPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.rowGap")}</dt>
                  <dd>{sourceInteraction.foundation.rowGap}{" -> "}{draftInteraction.foundation.rowGap}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.technicalAffordanceGap")}</dt>
                  <dd>{sourceInteraction.foundation.technicalAffordanceGap}{" -> "}{draftInteraction.foundation.technicalAffordanceGap}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.technicalSourceMaxWidth")}</dt>
                  <dd>{sourceInteraction.foundation.technicalSourceMaxWidth}{" -> "}{draftInteraction.foundation.technicalSourceMaxWidth}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.technicalEvidenceMaxWidth")}</dt>
                  <dd>{sourceInteraction.foundation.technicalEvidenceMaxWidth}{" -> "}{draftInteraction.foundation.technicalEvidenceMaxWidth}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.technicalPreviewChipMaxWidth")}</dt>
                  <dd>{sourceInteraction.foundation.technicalPreviewChipMaxWidth}{" -> "}{draftInteraction.foundation.technicalPreviewChipMaxWidth}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.pageHeaderPadding")}</dt>
                  <dd>{sourceInteraction.foundation.pageHeaderPadding}{" -> "}{draftInteraction.foundation.pageHeaderPadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.metadataGap")}</dt>
                  <dd>{sourceInteraction.foundation.metadataGap}{" -> "}{draftInteraction.foundation.metadataGap}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.pageIconSize")}</dt>
                  <dd>{sourceInteraction.foundation.pageIconSize}{" -> "}{draftInteraction.foundation.pageIconSize}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.badgeGap")}</dt>
                  <dd>{sourceInteraction.foundation.badgeGap}{" -> "}{draftInteraction.foundation.badgeGap}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.badgeHeight")}</dt>
                  <dd>{sourceInteraction.foundation.badgeHeight}{" -> "}{draftInteraction.foundation.badgeHeight}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.modeBadgePadding")}</dt>
                  <dd>{sourceInteraction.foundation.modeBadgePadding}{" -> "}{draftInteraction.foundation.modeBadgePadding}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.badgeFontSize")}</dt>
                  <dd>{sourceInteraction.foundation.badgeFontSize}{" -> "}{draftInteraction.foundation.badgeFontSize}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.modeBadgeFontSize")}</dt>
                  <dd>{sourceInteraction.foundation.modeBadgeFontSize}{" -> "}{draftInteraction.foundation.modeBadgeFontSize}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.fileTooltipTrigger")}</dt>
                  <dd>{t(`designStudio.value.display.${sourceInteraction.tooltip.trigger}`)}{" -> "}{t(`designStudio.value.display.${draftInteraction.tooltip.trigger}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.copyTrigger")}</dt>
                  <dd>{t(`designStudio.value.display.${sourceInteraction.copyFeedback.trigger}`)}{" -> "}{t(`designStudio.value.display.${draftInteraction.copyFeedback.trigger}`)}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.fileTooltipMaxWidth")}</dt>
                  <dd>{sourceInteraction.tooltip.maxWidth}{" -> "}{draftInteraction.tooltip.maxWidth}</dd>
                </div>
                <div>
                  <dt>{t("designStudio.field.copyDuration")}</dt>
                  <dd>{sourceInteraction.copyFeedback.durationMs}ms{" -> "}{draftInteraction.copyFeedback.durationMs}ms</dd>
                </div>
              </dl>
            </details>
          </article>
        </div>
      </DetailSection>
      <DetailSection id="design-studio-contract" title={t("designStudio.contractTitle")} Icon={FileCheck2}>
        <div className="sidebar-page-card-grid">
          <SidebarPageCard Icon={FileText} title={t("designStudio.contract.human")} detail="docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md" status="ready" t={t} />
          <SidebarPageCard Icon={FileJson} title={t("designStudio.contract.machine")} detail="tokens.json / components.json" status="ready" t={t} />
          <SidebarPageCard Icon={Code2} title={t("designStudio.contract.generated")} detail="design-system.generated.css / js" status="ready" t={t} />
          <SidebarPageCard Icon={FileCheck2} title={t("designStudio.contract.check")} detail="tools/check_dashboard_design_system.sh" status="ready" t={t} />
        </div>
      </DetailSection>
      <SourceBoundary data={data} t={t} />
    </section>
  );
}

function SettingsPage({ data, locale, t, onRefreshSnapshot }) {
  const [selectedSettingId, setSelectedSettingId] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [mutationState, setMutationState] = useState({ status: "idle", result: null, error: null });
  const [planToken, setPlanToken] = useState("");
  const [planIdentity, setPlanIdentity] = useState(null);
  const [applyFeedback, setApplyFeedback] = useState({ status: "idle", visible: false });
  const rowRefs = useRef({});
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousSelectedSettingIdRef = useRef("");
  const applyFeedbackRequestIdRef = useRef(0);
  const applyFeedbackTimersRef = useRef({ show: 0, close: 0 });
  const context = selectedContextData(data);
  const authority = data.development?.product_authority || {};
  const { settings, groups, items } = settingsCatalogData(data);
  const displayPolicy = displayDepthPolicyForData(data);
  const displayDepth = displayPolicy.depth;
  const hasSettingsCatalog = groups.length > 0 && items.length > 0;
  const reviewItems = items.filter((item) => isReviewState(item.status));
  const selectedRepository = repositoryDisplayName(context.target_repository?.name || authority.repository?.configured_name || authority.repository?.name, t);
  const selectedSetting = items.find((item) => displayText(item.id, "") === selectedSettingId) || null;
  const selectedMenuId = displayText(context.menu_id, "step_1_14");
  const snapshotIdentity = useMemo(() => ({
    snapshotId: displayText(data.snapshot_id, ""),
    contentHash: displayText(data.content_hash, ""),
  }), [data.snapshot_id, data.content_hash]);
  const editableOptions = selectedSetting ? settingEditableOptions(selectedSetting) : [];
  const selectedSettingEditable = Boolean(selectedSetting?.editable && editableOptions.length);
  const clearApplyFeedbackTimers = () => {
    window.clearTimeout(applyFeedbackTimersRef.current.show);
    window.clearTimeout(applyFeedbackTimersRef.current.close);
    applyFeedbackTimersRef.current = { show: 0, close: 0 };
  };
  const dismissApplyFeedback = () => {
    clearApplyFeedbackTimers();
    setApplyFeedback({ status: "idle", visible: false });
  };
  const updateApplyFeedback = (requestId, updates) => {
    setApplyFeedback((previous) => (previous.requestId === requestId ? { ...previous, ...updates } : previous));
  };
  const completeApplyFeedback = (requestId) => {
    setApplyFeedback((previous) => {
      if (previous.requestId !== requestId) {
        return previous;
      }
      if (!previous.visible) {
        return { status: "idle", visible: false };
      }
      return { ...previous, status: "reconciled", visible: true, error: null };
    });
    window.clearTimeout(applyFeedbackTimersRef.current.close);
    applyFeedbackTimersRef.current.close = window.setTimeout(() => {
      setApplyFeedback((previous) => (previous.requestId === requestId ? { status: "idle", visible: false } : previous));
    }, SETTINGS_APPLY_FEEDBACK_AUTO_CLOSE_MS);
  };
  const startApplyFeedback = ({ settingId, requestedValue, result, settingTitle, status = "reconciling" }) => {
    clearApplyFeedbackTimers();
    const requestId = applyFeedbackRequestIdRef.current + 1;
    applyFeedbackRequestIdRef.current = requestId;
    setApplyFeedback({
      requestId,
      status,
      visible: false,
      settingId,
      requestedValue,
      result,
      settingTitle,
      baseSnapshotSignature: displayText(data.snapshot_id || data.content_hash, ""),
      error: null,
      saved: status !== "applying",
    });
    applyFeedbackTimersRef.current.show = window.setTimeout(() => {
      setApplyFeedback((previous) => {
        if (previous.requestId !== requestId || ["idle", "reconciled"].includes(previous.status)) {
          return previous;
        }
        return { ...previous, visible: true };
      });
    }, SETTINGS_APPLY_FEEDBACK_DELAY_MS);
    return requestId;
  };
  const closeSelectedSetting = () => {
    const previousId = selectedSettingId;
    setSelectedSettingId("");
    window.setTimeout(() => rowRefs.current[previousId]?.focus(), 0);
  };

  const resetMutationState = () => {
    setConfirmed(false);
    setMutationState({ status: "idle", result: null, error: null });
    setPlanToken("");
    setPlanIdentity(null);
  };

  useEffect(() => {
    if (!selectedSetting) {
      previousSelectedSettingIdRef.current = "";
      setDraftValue("");
      resetMutationState();
      return undefined;
    }
    const selectedSettingChanged = previousSelectedSettingIdRef.current !== selectedSettingId;
    previousSelectedSettingIdRef.current = selectedSettingId;
    const currentValue = displayText(selectedSetting.current_value, "");
    if (selectedSettingChanged || mutationState.status !== "applied") {
      setDraftValue(editableOptions.includes(currentValue) ? currentValue : editableOptions[0] || "");
      resetMutationState();
    }
    return undefined;
  }, [selectedSettingId, selectedSetting?.current_value, selectedMenuId, snapshotIdentity.snapshotId, snapshotIdentity.contentHash]);

  useEffect(() => {
    if (!selectedSetting) {
      return undefined;
    }
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSelectedSetting();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const modal = modalRef.current;
      if (!modal) {
        return;
      }
      const focusable = Array.from(
        modal.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedSettingId]);

  useEffect(() => () => clearApplyFeedbackTimers(), []);

  useEffect(() => {
    if (!["reconciling", "stale_snapshot", "timeout"].includes(applyFeedback.status) || !applyFeedback.settingId) {
      return;
    }
    if (settingsSnapshotReconciles(data, applyFeedback.settingId, applyFeedback.requestedValue, applyFeedback.result)) {
      completeApplyFeedback(applyFeedback.requestId);
    }
  }, [data, applyFeedback.status, applyFeedback.requestId]);

  const handlePlanSetting = async () => {
    if (!selectedSettingEditable || !draftValue || !selectedSetting) {
      return;
    }
    setConfirmed(false);
    setPlanToken("");
    setPlanIdentity(null);
    setMutationState({ status: "planning", result: null, error: null });
    try {
      const result = await planDashboardSettingChange(displayText(selectedSetting.id), draftValue, selectedMenuId);
      if (result.status !== "blocked" && !result.plan_token) {
        throw new Error(t("settingsPage.modal.planTokenMissing"));
      }
      setPlanToken(result.plan_token || "");
      setPlanIdentity({
        settingId: displayText(selectedSetting.id),
        requestedValue: draftValue,
        menuId: selectedMenuId,
        snapshotId: snapshotIdentity.snapshotId,
        contentHash: snapshotIdentity.contentHash,
      });
      setMutationState({ status: result.status === "blocked" ? "blocked" : "planned", result, error: null });
    } catch (error) {
      setPlanToken("");
      setPlanIdentity(null);
      setMutationState({ status: "error", result: null, error });
    }
  };

  const handleApplySetting = async () => {
    if (!selectedSettingEditable || !draftValue || !selectedSetting || !confirmed || mutationState.status !== "planned" || !planToken) {
      return;
    }
    const currentPlanMatches =
      planIdentity &&
      planIdentity.settingId === displayText(selectedSetting.id) &&
      planIdentity.requestedValue === draftValue &&
      planIdentity.menuId === selectedMenuId &&
      planIdentity.snapshotId === snapshotIdentity.snapshotId &&
      planIdentity.contentHash === snapshotIdentity.contentHash;
    if (!currentPlanMatches) {
      setConfirmed(false);
      setPlanToken("");
      setPlanIdentity(null);
      setMutationState({ status: "error", result: mutationState.result, error: new Error(t("settingsPage.modal.planTokenStale")) });
      return;
    }
    const settingId = displayText(selectedSetting.id);
    const requestedValue = draftValue;
    const settingTitle = settingItemTitle(selectedSetting, t);
    setMutationState((previous) => ({ ...previous, status: "applying", error: null }));
    setConfirmed(false);
    const requestId = startApplyFeedback({ settingId, requestedValue, result: null, settingTitle, status: "applying" });
    setSelectedSettingId("");
    if (settingId === "workflow_language") {
      onRefreshSnapshot?.({ localeHint: { workflow_language: requestedValue }, immediateOnly: true });
    }
    try {
      const result = await applyDashboardSettingChange(settingId, requestedValue, selectedMenuId, planToken, snapshotIdentity);
      setPlanToken("");
      setPlanIdentity(null);
      if (!result.applied) {
        if (result.status === "blocked") {
          const reason = t(displayText(result.reason_key, ""), t("settingsPage.modal.applyFailed"));
          const nextAction = t(displayText(result.next_action_key, ""), "");
          updateApplyFeedback(requestId, { status: "blocked", visible: true, result, error: new Error(nextAction ? `${reason} ${nextAction}` : reason), saved: false });
          setMutationState({ status: "blocked", result, error: null });
          return;
        }
        throw new Error(t(displayText(result.reason_key, ""), t("settingsPage.modal.applyFailed")));
      }
      updateApplyFeedback(requestId, { status: "reconciling", result, error: null, saved: true });
      if (settingId === "workflow_language") {
        onRefreshSnapshot?.({ localeHint: result, immediateOnly: true });
      }
      if (!result.snapshot_regenerated) {
        if (settingId === "workflow_language") {
          onRefreshSnapshot?.({ clearLocaleHint: true, immediateOnly: true });
        }
        updateApplyFeedback(requestId, { status: "failed", visible: true, error: new Error(t("settingsPage.applyFeedback.failedDetail")), saved: true });
        return;
      }
      try {
        const snapshot = await withTimeout(
          onRefreshSnapshot?.(),
          SETTINGS_APPLY_FEEDBACK_TIMEOUT_MS,
          t("settingsPage.applyFeedback.timeoutDetail"),
        );
        if (settingsSnapshotReconciles(snapshot?.data, settingId, requestedValue, result)) {
          completeApplyFeedback(requestId);
        } else {
          updateApplyFeedback(requestId, { status: "stale_snapshot", visible: true, error: null, saved: true });
        }
      } catch (error) {
        if (settingId === "workflow_language") {
          onRefreshSnapshot?.({ clearLocaleHint: true, immediateOnly: true });
        }
        updateApplyFeedback(requestId, {
          status: displayText(error.message, "") === t("settingsPage.applyFeedback.timeoutDetail") ? "timeout" : "failed",
          visible: true,
          error,
          saved: true,
        });
      }
    } catch (error) {
      setPlanToken("");
      setPlanIdentity(null);
      if (settingId === "workflow_language") {
        onRefreshSnapshot?.({ clearLocaleHint: true, immediateOnly: true });
      }
      updateApplyFeedback(requestId, { status: "failed", visible: true, error, saved: false });
      setMutationState((previous) => ({ ...previous, status: "error", error }));
    }
  };

  return (
    <section className="view-surface view-surface--settings sidebar-page" id="settings" aria-labelledby="settings-heading" data-dashboard-display-depth={displayDepth}>
      <DetailPageHeader tone="settings" Icon={Settings} title={t("settingsPage.title")} subtitle={t("settingsPage.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="settings-heading" />
      <ProducerDecisionSummary data={data} pageId="settings" tone="sidebar" t={t} />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: Compass, label: t("settingsPage.summary.selectedMenu"), value: contextLabel(context.menu_id, t), detail: workflowContextLabel(context.workflow_context, t) },
          { Icon: Database, label: t("settingsPage.summary.targetRepository"), value: selectedRepository, detail: productTypeLabel(context.product_type, t) },
          { Icon: Scale, label: t("detail.currentJudgment"), value: reviewItems.length ? t("detail.judgment.needsReviewShort") : t("detail.judgment.readyShort"), detail: hasSettingsCatalog ? (reviewItems.length ? t("settingsPage.summary.reviewDetail") : t("settingsPage.summary.readyDetail")) : t("settingsPage.emptyDetail"), tone: reviewItems.length || !hasSettingsCatalog ? "warning" : "ready" },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: t("settingsPage.summary.next"), detail: t("settingsPage.summary.nextDetail"), cta: { href: "#maintenance", label: t("summary.viewDetails") } },
        ]}
      />
      {hasSettingsCatalog ? (
        groups.map((group) => {
          const groupItems = items.filter((item) => displayText(item.group_id, "") === displayText(group.id, ""));
          const GroupIcon = settingGroupIconFor(group);
          return (
            <DetailSection id={`settings-${displayText(group.id)}`} title={settingGroupTitle(group, t)} Icon={GroupIcon} key={displayText(group.id)}>
              <div className="settings-group-intro">
                <p>{settingGroupDetail(group, t)}</p>
                <StatusPill value={group.status || "unknown"} t={t} label={statusLabelForChip(group.status, t)} />
              </div>
              <div className="settings-row-list">
                {groupItems.map((item) => {
                  const ItemIcon = settingItemIconFor(item);
                  const itemId = displayText(item.id);
                  return (
                    <button
                      className="settings-row"
                      type="button"
                      data-settings-row-id={itemId}
                      key={itemId}
                      ref={(node) => {
                        if (node) {
                          rowRefs.current[itemId] = node;
                        }
                      }}
                      onClick={() => setSelectedSettingId(itemId)}
                      aria-label={`${settingItemTitle(item, t)} ${settingRowActionLabel(item, t)}. ${settingChangeabilityLabel(item, t)}`}
                    >
                      <span className="settings-row__icon">
                        <ItemIcon aria-hidden="true" size={20} />
                      </span>
                      <span className="settings-row__main">
                        <strong>{settingItemTitle(item, t)}</strong>
                        <small>{settingItemDetail(item, t)}</small>
                        {settingConsistencyHasNotice(item) ? <small className="settings-row__consistency">{settingConsistencyReason(item, t)}</small> : null}
                      </span>
                      <span className="settings-row__value">
                        <small>{t("settingsPage.field.currentValue")}</small>
                        <strong>{settingValueLabel(item, t)}</strong>
                      </span>
                      <span className="settings-row__meta">
                        <small>{t("field.status")}</small>
                        <StatusPill value={item.status || "unknown"} t={t} label={statusLabelForChip(item.status, t)} />
                      </span>
                      <span className="settings-row__source" title={displayText(item.source_file)}>
                        <small>{t("settingsPage.field.sourceFile")}</small>
                        <strong>{displayText(item.source_file)}</strong>
                      </span>
                      <span className="settings-row__related">
                        <small>{t("settingsPage.field.relatedPage")}</small>
                        <strong>{settingRelatedPageLabel(item.related_page, t)}</strong>
                      </span>
                      <span className="settings-row__open">
                        <Eye aria-hidden="true" size={16} />
                        {settingRowActionLabel(item, t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </DetailSection>
          );
        })
      ) : (
        <DetailSection id="settings-unavailable" title={t("settingsPage.emptyTitle")} Icon={AlertTriangle}>
          <SidebarPageCard Icon={AlertTriangle} title={t("settingsPage.emptyTitle")} detail={t("settingsPage.emptyDetail")} status={settings.status || "unknown"} t={t} />
        </DetailSection>
      )}
      {selectedSetting ? (
        <div className="settings-modal-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeSelectedSetting();
          }
        }}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" ref={modalRef} tabIndex={-1}>
            <div className="settings-modal__header">
              <span className="settings-modal__icon">
                {(() => {
                  const SelectedIcon = settingItemIconFor(selectedSetting);
                  return <SelectedIcon aria-hidden="true" size={24} />;
                })()}
              </span>
              <div>
                <small>{t("settingsPage.modal.eyebrow")}</small>
                <h2 id="settings-modal-title">{settingItemTitle(selectedSetting, t)}</h2>
                <p>{settingItemDetail(selectedSetting, t)}</p>
              </div>
              <button className="settings-modal__close" type="button" onClick={closeSelectedSetting} aria-label={t("settingsPage.modal.close")} ref={closeButtonRef}>
                <CircleX aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="settings-modal__status">
              <div>
                <span>{t("settingsPage.field.currentValue")}</span>
                <strong>{settingValueLabel(selectedSetting, t)}</strong>
              </div>
              <StatusPill value={selectedSetting.status || "unknown"} t={t} label={statusLabelForChip(selectedSetting.status, t)} />
            </div>
            <div className="settings-modal__body">
              <section>
                <h3>{t("settingsPage.modal.changeabilityTitle")}</h3>
                <p>{settingChangeabilityLabel(selectedSetting, t)}</p>
                <small>{t(displayText(selectedSetting.disabled_reason_key, ""), t("settingsPage.change.disabled"))}</small>
              </section>
              <section>
                <h3>{t("settingsPage.modal.consistencyTitle")}</h3>
                <StatusPill value={settingConsistency(selectedSetting).status || selectedSetting.status || "unknown"} t={t} label={statusLabelForChip(settingConsistency(selectedSetting).status || selectedSetting.status, t)} />
                <p>{settingConsistencyReason(selectedSetting, t)}</p>
                <small>{settingConsistencyNextAction(selectedSetting, t)}</small>
              </section>
              <section>
                <h3>{t("settingsPage.modal.impactTitle")}</h3>
                <p>{settingReviewImpact(selectedSetting, t)}</p>
                <RiskPill value={selectedSetting.risk_level || "low"} t={t} />
              </section>
              <section>
                <h3>{t("settingsPage.modal.previewTitle")}</h3>
                <p>{settingReviewPreview(selectedSetting, t)}</p>
                <small>{t("settingsPage.modal.updateAction")}: {displayText(selectedSetting.update_action_id)}</small>
              </section>
              <section>
                <h3>{t("settingsPage.modal.sourceTitle")}</h3>
                <p>{displayText(selectedSetting.source_file)}</p>
                <small>{t("settingsPage.modal.targetFile")}: {displayText(selectedSetting.review?.target_file)}</small>
              </section>
              <section>
                <h3>{t("settingsPage.modal.allowedValuesTitle")}</h3>
                {asArray(selectedSetting.allowed_values).length ? (
                  <div className="settings-modal__allowed">
                    {asArray(selectedSetting.allowed_values).map((value) => (
                      <span key={displayText(value)}>{settingAllowedValueLabel(value, selectedSetting, t)}</span>
                    ))}
                  </div>
                ) : (
                  <p>{t("settingsPage.modal.noAllowedValues")}</p>
                )}
              </section>
              <section className="settings-modal__change">
                <h3>{t("settingsPage.modal.proposedValueTitle")}</h3>
                {selectedSettingEditable ? (
                  <>
                    <label className="settings-value-select">
                      <span>{t("settingsPage.field.proposedValue")}</span>
                      <select
                        value={draftValue}
                        onChange={(event) => {
                          setDraftValue(event.target.value);
                          resetMutationState();
                        }}
                      >
                        {editableOptions.map((value) => (
                          <option value={value} key={value}>{settingAllowedValueLabel(value, selectedSetting, t)}</option>
                        ))}
                      </select>
                    </label>
                    {settingShowsAutomationNote(selectedSetting) ? (
                      <small className="settings-modal__automation-note">{t("settingsPage.modal.autoMeansPriorApproval")}</small>
                    ) : null}
                    {settingShowsApprovalNote(selectedSetting) ? (
                      <small className="settings-modal__automation-note">{t("settingsPage.modal.afterApprovalMeansExternalApproval")}</small>
                    ) : null}
                    {settingIsGitWorkflowSetting(selectedSetting) ? (
                      <small className="settings-modal__git-note">{t("settingsPage.modal.gitSettingsBoundary")}</small>
                    ) : null}
                    <div className="settings-action-row">
                      <button type="button" onClick={handlePlanSetting} disabled={!draftValue || mutationState.status === "planning" || mutationState.status === "applying"}>
                        <Pencil aria-hidden="true" size={16} />
                        {mutationState.status === "planning" ? t("settingsPage.modal.planning") : t("settingsPage.modal.planChange")}
                      </button>
                    </div>
                    <label className="settings-confirm-row">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={mutationState.status !== "planned"}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      <span>{t("settingsPage.modal.confirmApply")}</span>
                    </label>
                    <div className="settings-action-row">
                      <button
                        className="settings-action-button--primary"
                        type="button"
                        onClick={handleApplySetting}
                        disabled={!confirmed || mutationState.status !== "planned" || mutationState.result?.requested_value !== draftValue || !planToken}
                      >
                        <Check aria-hidden="true" size={16} />
                        {mutationState.status === "applying" ? t("settingsPage.modal.applying") : t("settingsPage.modal.applyChange")}
                      </button>
                    </div>
                    {mutationState.result ? (
                      <div className={`settings-result settings-result--${mutationState.status === "applied" ? "applied" : mutationState.status === "blocked" ? "blocked" : "planned"}`} role={mutationState.status === "blocked" ? "alert" : "status"}>
                        <StatusPill value={mutationState.status === "applied" ? "passed" : mutationState.status === "blocked" ? "blocked" : "ready"} t={t} label={mutationState.status === "applied" ? t("settingsPage.modal.applied") : mutationState.status === "blocked" ? statusLabelForChip("blocked", t) : t("settingsPage.modal.planReady")} />
                        <p>{mutationState.status === "applied" ? t("settingsPage.modal.applyResult") : mutationState.status === "blocked" ? t(displayText(mutationState.result.reason_key, ""), t("settingsPage.modal.planBlocked")) : t("settingsPage.modal.planResult")}</p>
                        {mutationState.status === "blocked" ? <small>{t(displayText(mutationState.result.next_action_key, ""), t("settingsPage.consistency.next.none"))}</small> : null}
                        <small>{t("settingsPage.modal.targetFile")}: {displayText(mutationState.result.target_file)}</small>
                        <details data-dashboard-display-depth={displayDepth} open={displayPolicy.settingsTechnicalDetailsDefaultOpen}>
                          <summary>{t("settingsPage.modal.technicalDetails")}</summary>
                          <code>{displayText(mutationState.result.tool_command)}</code>
                        </details>
                      </div>
                    ) : null}
                    {mutationState.error ? (
                      <div className="settings-result settings-result--error" role="alert">
                        <StatusPill value="failed" t={t} label={statusLabelForChip("failed", t)} />
                        <p>{displayText(mutationState.error.message, t("settingsPage.modal.applyFailed"))}</p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p>{t(displayText(selectedSetting.disabled_reason_key, ""), t("settingsPage.change.disabled"))}</p>
                    <small>{t("settingsPage.modal.displayOnlyDetail")}</small>
                  </>
                )}
              </section>
              <section>
                <h3>{t("settingsPage.modal.validationTitle")}</h3>
                <StatusPill value={selectedSetting.review?.validation_status || "unknown"} t={t} label={statusLabelForChip(selectedSetting.review?.validation_status, t)} />
                <p>{selectedSetting.requires_confirmation ? t("settingsPage.modal.confirmationRequired") : t("settingsPage.modal.confirmationNotRequired")}</p>
              </section>
            </div>
            <div className="settings-modal__footer">
              <a href={displayText(selectedSetting.related_page, "#settings")} onClick={closeSelectedSetting}>
                {t("settingsPage.modal.related")}
                <ChevronRight aria-hidden="true" size={16} />
              </a>
              <button type="button" onClick={closeSelectedSetting}>{t("settingsPage.modal.close")}</button>
            </div>
          </div>
        </div>
      ) : null}
      <SettingsApplyFeedback feedback={applyFeedback} t={t} onDismiss={dismissApplyFeedback} />
      <MockNotice tone="settings-warning" Icon={Lock} title={t("settingsPage.notice.title")} detail={t("settingsPage.notice.detail")} />
    </section>
  );
}

const glossaryCategories = [
  {
    id: "dashboard",
    icon: CircleHelp,
    terms: ["dashboardControlCenter", "selectedMenu", "currentJudgment", "status", "displayOnly", "sourceFile", "sourceCommand"],
  },
  {
    id: "repositories",
    icon: Database,
    terms: ["lessonRepository", "productRepository", "productWorkspace", "repositoryBoundary", "gitWorktree", "workingTree"],
  },
  {
    id: "gitCi",
    icon: GitBranch,
    terms: ["git", "branch", "commit", "push", "pullRequest", "prCi", "mainCi", "merge", "localRemoteSync"],
  },
  {
    id: "workflow",
    icon: WorkflowCategoryIcon,
    terms: ["skill", "repositoryDevelopmentWorkflow", "productDevelopmentWorkflow", "fastLoop", "midTests", "releaseGate"],
  },
  {
    id: "documents",
    icon: FileText,
    terms: ["requirements", "specification", "implementationPlan", "taskTracker", "handoff", "developerMemory", "sourceOfTruth", "documentSync"],
  },
  {
    id: "testsEvidence",
    icon: FileSearch,
    terms: ["unitTest", "aggregateTest", "gitHooks", "snapshot", "evidence", "freshness"],
  },
  {
    id: "safety",
    icon: ShieldCheck,
    terms: ["securityGate", "approval", "blocker", "secretLikeData", "leastPrivilege"],
  },
  {
    id: "settings",
    icon: Settings,
    terms: ["settings", "learningMode", "workflowDisplayLanguage", "productGitUsageMode", "prohibited", "askEachTime", "auto"],
  },
];

function helpTermSearchText(categoryId, term, t) {
  return [
    term,
    categoryId,
    t(`helpPage.glossary.${term}.title`, displayKey(term)),
    t(`helpPage.glossary.${term}.detail`, ""),
    t(`helpPage.glossaryCategory.${categoryId}`, displayKey(categoryId)),
    t(`helpPage.glossaryCategory.${categoryId}.detail`, ""),
  ]
    .join(" ")
    .toLowerCase();
}

function helpCurrentContextSummary(data, t) {
  const context = selectedContextData(data);
  const repository = repositoryDisplayName(context.target_repository?.name, t);
  const menu = contextLabel(context.menu_id, t);
  const workflow = workflowContextLabel(context.workflow_context, t);
  const failures = asArray(data.partial_failures);
  const evidenceRows = asArray(data.maintenance?.evidence_rows);
  const documents = asArray(data.documents?.catalog);
  const firstFailure = failures[0] || null;
  return {
    context,
    repository,
    menu,
    workflow,
    failures,
    evidenceRows,
    documents,
    firstFailure,
  };
}

function helpRecommendedTerms(data) {
  const context = selectedContextData(data);
  const menuId = displayText(context.menu_id, "");
  const failures = asArray(data.partial_failures);
  const recommended = ["selectedMenu", "productRepository", "repositoryBoundary", "sourceOfTruth"];
  if (menuId.includes("lesson")) {
    recommended.push("lessonRepository", "repositoryDevelopmentWorkflow");
  } else {
    recommended.push("productDevelopmentWorkflow");
  }
  if (failures.length) {
    recommended.push("blocker", "evidence", "securityGate");
  }
  recommended.push("sourceFile", "sourceCommand");
  return [...new Set(recommended)];
}

function glossaryTermExample(term, summary, t) {
  switch (term) {
    case "selectedMenu":
      return `${t("helpPage.glossaryContext.examplePrefix")} ${summary.menu}`;
    case "productRepository":
      return `${t("helpPage.glossaryContext.examplePrefix")} ${summary.repository}`;
    case "repositoryBoundary":
      return `${summary.repository} ${t("helpPage.glossaryContext.repositoryBoundaryExample")}`;
    case "sourceFile": {
      const source = asArray(summary.documents).find((item) => displayText(item.path, ""))?.path || "";
      return source ? `${t("helpPage.glossaryContext.examplePrefix")} ${displayText(source)}` : "";
    }
    case "sourceCommand": {
      const command = asArray(summary.evidenceRows).find((row) => displayText(row.required_command, ""))?.required_command || "";
      return command ? `${t("helpPage.glossaryContext.examplePrefix")} ${displayText(command)}` : "";
    }
    case "evidence": {
      const evidence = asArray(summary.evidenceRows).find((row) => normalizeState(row.status) !== "ready") || asArray(summary.evidenceRows)[0];
      return evidence ? `${t("helpPage.glossaryContext.examplePrefix")} ${displayText(evidence.label || evidence.id)}` : "";
    }
    case "blocker":
      return `${t("helpPage.glossaryContext.examplePrefix")} ${summary.failures.length ? `${summary.failures.length} ${t("helpPage.context.unresolvedUnit")}` : t("summary.none")}`;
    case "securityGate":
      return `${t("helpPage.glossaryContext.examplePrefix")} ${statusLabelForChip(summary.context.security_status, t)}`;
    case "productDevelopmentWorkflow":
      return `${t("helpPage.glossaryContext.examplePrefix")} ${summary.workflow}`;
    default:
      return "";
  }
}

function glossaryTermDetail(categoryId, term, t, data) {
  const title = t(`helpPage.glossary.${term}.title`, displayKey(term));
  const summary = helpCurrentContextSummary(data || {}, t);
  const example = glossaryTermExample(term, summary, t);
  const points = [
    `${t("helpPage.glossaryContext.currentTarget")}: ${summary.repository}`,
    `${t("helpPage.glossaryContext.currentMenu")}: ${summary.menu}`,
    example,
    summary.failures.length ? `${t("helpPage.glossaryContext.currentBlockers")}: ${summary.failures.length} ${t("helpPage.context.unresolvedUnit")}` : `${t("helpPage.glossaryContext.currentBlockers")}: ${t("summary.none")}`,
  ].filter((point) => displayText(point, ""));
  return {
    title,
    eyebrow: t(`helpPage.glossaryCategory.${categoryId}`, displayKey(categoryId)),
    summary: t(`helpPage.glossary.${term}.detail`, t("helpPage.glossary.default.detail")),
    where: t(`helpPage.glossary.${term}.where`, t(`helpPage.glossaryCategory.${categoryId}.where`, t("helpPage.glossary.default.where"))),
    why: t(`helpPage.glossary.${term}.why`, t("helpPage.glossary.default.why")),
    action: t(`helpPage.glossary.${term}.action`, `${t("helpPage.glossaryContext.openRelatedPage")} ${summary.menu}`),
    source: `${t(`helpPage.glossary.${term}.source`, t("helpPage.glossary.default.source"))} / ${summary.repository}`,
    points,
  };
}

function HelpPage({ data, locale, t }) {
  const [query, setQuery] = useState("");
  const contextSummary = helpCurrentContextSummary(data, t);
  const normalizedQuery = query.trim().toLowerCase();
  const recommendedTerms = helpRecommendedTerms(data);
  const recommendedTermSet = new Set(recommendedTerms);
  const topics = [
    { Icon: BookOpen, title: t("helpPage.topic.lessons.title"), detail: t("helpPage.topic.lessons.detail"), href: "#lessons" },
    { Icon: Info, title: t("helpPage.topic.repository.title"), detail: `${t("helpPage.topic.repository.detail")} ${contextSummary.repository}`, href: "#repository-info" },
    { Icon: WorkflowCategoryIcon, title: t("helpPage.topic.workflow.title"), detail: `${t("helpPage.topic.workflow.detail")} ${contextSummary.menu}`, href: "#workflow" },
    { Icon: RefreshCw, title: t("helpPage.topic.maintenance.title"), detail: `${t("helpPage.topic.maintenance.detail")} ${contextSummary.evidenceRows.length} ${t("helpPage.context.evidenceUnit")}`, href: "#maintenance" },
    { Icon: ShieldCheck, title: t("helpPage.topic.safety.title"), detail: `${t("helpPage.topic.safety.detail")} ${contextSummary.failures.length} ${t("helpPage.context.unresolvedUnit")}`, href: "#safety" },
    { Icon: Settings, title: t("helpPage.topic.settings.title"), detail: t("helpPage.topic.settings.detail"), href: "#settings" },
  ];
  const filteredCategories = glossaryCategories
    .map((category) => ({
      ...category,
      terms: category.terms.filter((term) => !normalizedQuery || helpTermSearchText(category.id, term, t).includes(normalizedQuery)),
    }))
    .filter((category) => category.terms.length);
  const firstFailure = contextSummary.firstFailure;
  const nextHref = contextSummary.failures.length ? "#safety" : "#repository-info";
  const nextLabel = contextSummary.failures.length ? t("nav.safety") : t("nav.repositoryInfo");

  return (
    <section className="view-surface view-surface--help sidebar-page" id="help" aria-labelledby="help-heading">
      <DetailPageHeader tone="help" Icon={CircleHelp} title={t("helpPage.title")} subtitle={t("helpPage.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="help-heading" />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: Compass, label: t("helpPage.summary.where"), value: contextSummary.menu, detail: contextSummary.workflow },
          { Icon: Database, label: t("helpPage.context.repository"), value: contextSummary.repository, detail: t("helpPage.context.repositoryDetail") },
          { Icon: ShieldCheck, label: t("helpPage.context.blockers"), value: contextSummary.failures.length ? `${contextSummary.failures.length} ${t("helpPage.context.unresolvedUnit")}` : t("summary.none"), detail: firstFailure ? `${sourceDetector(firstFailure.source, t)}: ${localizedSecurityDetail(firstFailure.reason, t)}` : t("helpPage.context.noBlockers"), tone: contextSummary.failures.length ? "warning" : "ready" },
          { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: nextLabel, detail: contextSummary.failures.length ? t("helpPage.context.nextSafetyDetail") : t("helpPage.context.nextRepositoryDetail"), cta: { href: nextHref, label: nextLabel } },
        ]}
      />
      <DetailSection id="help-current-context" title={t("helpPage.contextTitle")} Icon={Target}>
        <div className="help-context-grid">
          <SidebarPageCard Icon={Database} title={t("helpPage.context.repository")} detail={t("helpPage.context.repositoryDetail")} status={contextSummary.context.target_repository?.path_state || "unknown"} t={t}>
            <div className="help-context-fact">
              <strong>{contextSummary.repository}</strong>
              <span>{contextSummary.menu}</span>
            </div>
          </SidebarPageCard>
          <SidebarPageCard Icon={FileSearch} title={t("helpPage.context.evidence")} detail={t("helpPage.context.evidenceDetail")} status={contextSummary.failures.length ? "manual_required" : "ready"} t={t}>
            <div className="help-context-fact">
              <strong>{contextSummary.evidenceRows.length} {t("helpPage.context.evidenceUnit")}</strong>
              <span>{contextSummary.failures.length ? `${contextSummary.failures.length} ${t("helpPage.context.unresolvedUnit")}` : t("helpPage.context.noBlockers")}</span>
            </div>
          </SidebarPageCard>
          <SidebarPageCard Icon={Clock} title={t("helpPage.context.updated")} detail={t("helpPage.context.updatedDetail")} status="cached" t={t}>
            <div className="help-context-fact">
              <strong>{formatDateTime(data.generated_at || contextSummary.context.updated_at, locale)}</strong>
              <span>{contextSummary.documents.length} {t("helpPage.context.documentUnit")}</span>
            </div>
          </SidebarPageCard>
        </div>
      </DetailSection>
      <DetailSection id="help-topics" title={t("helpPage.topicsTitle")} Icon={CircleHelp}>
        <div className="sidebar-page-link-grid">
          {topics.map((topic) => (
            <SidebarPageLinkCard {...topic} key={topic.title} />
          ))}
        </div>
      </DetailSection>
      <DetailSection id="help-recommended" title={t("helpPage.recommendedTitle")} Icon={ListChecks}>
        <div className="sidebar-glossary-grid">
          {glossaryCategories.flatMap(({ id, terms }) =>
            terms.filter((term) => recommendedTermSet.has(term)).map((term) => {
              const detail = glossaryTermDetail(id, term, t, data);
              return (
                <article className="sidebar-glossary-card sidebar-glossary-card--recommended" key={`${id}-${term}`}>
                  <strong>{detail.title}</strong>
                  <p>{detail.summary}</p>
                  <small>{t(`helpPage.glossaryCategory.${id}`, displayKey(id))}</small>
                  <InsightDetailButton detail={detail} label={t("helpPage.glossary.openDetail")} t={t} tone="help" />
                </article>
              );
            })
          )}
        </div>
      </DetailSection>
      <DetailSection id="help-glossary" title={t("helpPage.glossaryTitle")} Icon={BookMarked}>
        <label className="help-search">
          <span>{t("helpPage.searchLabel")}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("helpPage.searchPlaceholder")} />
        </label>
        <div className="glossary-category-stack">
          {filteredCategories.map(({ id, icon: CategoryIcon, terms }) => (
            <section className="glossary-category" aria-labelledby={`glossary-category-${id}`} key={id}>
              <div className="glossary-category__head">
                <CategoryIcon aria-hidden="true" size={19} />
                <div>
                  <h4 id={`glossary-category-${id}`}>{t(`helpPage.glossaryCategory.${id}`, displayKey(id))}</h4>
                  <p>{t(`helpPage.glossaryCategory.${id}.detail`, t("helpPage.glossaryCategory.default.detail"))}</p>
                </div>
              </div>
              <div className="sidebar-glossary-grid">
                {terms.map((term) => {
                  const detail = glossaryTermDetail(id, term, t, data);
                  return (
                    <article className="sidebar-glossary-card" key={term}>
                      <strong>{detail.title}</strong>
                      <p>{detail.summary}</p>
                      <InsightDetailButton detail={detail} label={t("helpPage.glossary.openDetail")} t={t} tone="help" />
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {!filteredCategories.length ? <p className="help-empty-search">{t("helpPage.emptySearch")}</p> : null}
        </div>
      </DetailSection>
    </section>
  );
}

function shortIdentifier(value, head = 12, tail = 8) {
  const text = displayText(value, "");
  if (!text || text.length <= head + tail + 3) {
    return text;
  }
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function historyRepositoryScope(data) {
  return data.repository_scope && typeof data.repository_scope === "object" ? data.repository_scope : {};
}

function historyInventorySummary(scope, t) {
  const summary = scope.inventory?.summary || {};
  const parts = [];
  if (Number.isInteger(summary.files)) {
    parts.push(`${t("historyPage.inventory.files")}: ${summary.files}`);
  }
  if (Number.isInteger(summary.indexed_files)) {
    parts.push(`${t("historyPage.inventory.indexed")}: ${summary.indexed_files}`);
  }
  if (Number.isInteger(summary.added_since_index) && summary.added_since_index > 0) {
    parts.push(`${t("historyPage.inventory.added")}: ${summary.added_since_index}`);
  }
  return parts.join(" / ");
}

function localizedHistoryWarning(warning, t) {
  const text = displayText(warning, "");
  const known = {
    "repository index does not include every observed file": "historyPage.warning.repositoryIndexIncomplete",
  };
  return known[text] ? t(known[text]) : text;
}

function historyWarningItems(data, t) {
  const scope = historyRepositoryScope(data);
  const topLevelWarnings = asArray(data.warnings).map((warning, index) => ({
    id: `snapshot-${index}`,
    source: t("historyPage.warningSource.snapshot"),
    detail: displayText(warning),
  }));
  const inventoryWarnings = asArray(scope.inventory?.warnings).map((warning, index) => ({
    id: `repository-inventory-${index}`,
    source: t("historyPage.warningSource.repositoryInventory"),
    detail: localizedHistoryWarning(warning, t),
  }));
  return [...topLevelWarnings, ...inventoryWarnings];
}

function historyFailureItems(data) {
  return asArray(data.partial_failures);
}

function HistoryIssueList({ warnings, failures, t }) {
  const hasIssues = warnings.length || failures.length;
  if (!hasIssues) {
    return <SidebarPageCard Icon={CheckCircle2} title={t("summary.none")} detail={t("historyPage.noIssues")} status="ready" t={t} />;
  }
  return (
    <div className="history-issue-list">
      {warnings.map((warning) => (
        <article className="history-issue history-issue--warning" key={warning.id}>
          <AlertTriangle aria-hidden="true" size={18} />
          <div>
            <strong>{warning.source}</strong>
            <p>{warning.detail}</p>
          </div>
        </article>
      ))}
      {failures.map((failure, index) => (
        <article className="history-issue history-issue--failure" key={`${displayText(failure.source)}-${index}`}>
          <ShieldAlert aria-hidden="true" size={18} />
          <div>
            <strong>{sourceDetector(failure.source, t)}</strong>
            <p>{localizedSecurityDetail(failure.reason, t)}</p>
            {displayText(failure.required_command, "") ? <small>{t("historyPage.issue.requiredCommand")}: {displayText(failure.required_command)}</small> : null}
          </div>
          <StatusPill value={failure.status || "unknown"} t={t} label={statusLabelForChip(failure.status || "unknown", t)} />
        </article>
      ))}
    </div>
  );
}

function HistoryPage({ data, locale, t }) {
  const context = selectedContextData(data);
  const scope = historyRepositoryScope(data);
  const targetRepository = repositoryDisplayName(context.target_repository?.name || scope.repository_name, t);
  const warnings = historyWarningItems(data, t);
  const failures = historyFailureItems(data);
  const sourceFiles = asArray(data.source_files);
  const sourceCommands = asArray(data.source_commands);
  const issueCount = warnings.length + failures.length;
  const observedAt = formatDashboardDateTime(scope.observed_at) || formatGenerated(data, locale);
  const scopeIdentity = shortIdentifier(scope.scope_id || scope.inventory_hash || "", 8, 4);
  const inventorySummary = historyInventorySummary(scope, t);
  return (
    <section className="view-surface view-surface--history sidebar-page" id="history" aria-labelledby="history-heading">
      <DetailPageHeader tone="history" Icon={Clock} title={t("historyPage.title")} subtitle={t("historyPage.description")} data={data} locale={locale} t={t} actionLabel={t("detail.refreshDisplayOnly")} headingId="history-heading" />
      <ProducerDecisionSummary data={data} pageId="history" tone="sidebar" t={t} />
      <DetailDecisionSummary
        tone="sidebar"
        t={t}
        items={[
          { Icon: CalendarDays, label: t("historyPage.summary.generated"), value: formatGenerated(data, locale), detail: t("historyPage.summary.generatedDetail") },
          { Icon: Database, label: t("historyPage.summary.target"), value: targetRepository, detail: `${contextLabel(context.menu_id, t)} / ${workflowContextLabel(context.workflow_context, t)}` },
          { Icon: FileJson, label: t("historyPage.summary.scope"), value: scopeIdentity || shortIdentifier(data.snapshot_id), detail: inventorySummary || t("historyPage.summary.scopeDetail") },
          { Icon: AlertTriangle, label: t("historyPage.summary.issues"), value: issueCount ? `${issueCount}` : t("summary.none"), detail: issueCount ? t("historyPage.summary.issueDetail") : t("historyPage.summary.noIssueDetail"), tone: issueCount ? "warning" : "ready" },
          { Icon: FileText, label: t("historyPage.summary.sources"), valueLines: [`${t("historyPage.sourceFilesCount")}: ${sourceFiles.length}`, `${t("historyPage.sourceCommandsCount")}: ${sourceCommands.length}`], detail: t("historyPage.summary.sourcesDetail") },
        ]}
      />
      <DetailSection id="history-snapshot" title={t("historyPage.snapshotTitle")} Icon={FileJson}>
        <div className="sidebar-page-card-grid">
          <SidebarPageCard Icon={CalendarDays} title={t("summary.generated")} detail={formatGenerated(data, locale)} status="ready" t={t} />
          <SidebarPageCard Icon={Database} title={t("historyPage.snapshotTarget")} detail={`${targetRepository} / ${contextLabel(context.menu_id, t)}`} status={scope.path_state || context.target_repository?.path_state || "unknown"} t={t} />
          <SidebarPageCard Icon={Clock} title={t("historyPage.observedAt")} detail={observedAt} status={scope.inventory?.status || "cached"} t={t} />
          <SidebarPageCard Icon={Database} title={t("summary.schema")} detail={displayText(data.schema_version)} status="ready" t={t} />
          <SidebarPageCard Icon={FileJson} title={t("historyPage.snapshotIdentity")} detail={shortIdentifier(data.snapshot_id)} status={data.snapshot_id ? "ready" : "unknown"} t={t}>
            <SidebarReferenceChip value={data.snapshot_id} t={t} />
          </SidebarPageCard>
          <SidebarPageCard Icon={FileJson} title={t("historyPage.contentHash")} detail={shortIdentifier(data.content_hash)} status={data.content_hash ? "ready" : "unknown"} t={t}>
            <SidebarReferenceChip value={data.content_hash} t={t} />
          </SidebarPageCard>
          <SidebarPageCard Icon={FileSearch} title={t("historyPage.inventoryHash")} detail={shortIdentifier(scope.inventory_hash)} status={scope.inventory_hash ? scope.inventory?.status || "cached" : "unknown"} t={t}>
            <SidebarReferenceChip value={scope.inventory_hash} t={t} />
          </SidebarPageCard>
          <SidebarPageCard Icon={Lock} title={t("app.readOnly")} detail={t("historyPage.readOnlyDetail")} status="ready" t={t} />
        </div>
      </DetailSection>
      <DetailSection id="history-issues" title={t("historyPage.issuesTitle")} Icon={AlertTriangle}>
        <HistoryIssueList warnings={warnings} failures={failures} t={t} />
      </DetailSection>
      <WorkflowRecentTable rows={data.development?.recent_runs} data={data} t={t} />
      <DetailSection id="history-warnings" title={t("summary.warnings")} Icon={AlertTriangle}>
        {warnings.length ? (
          <div className="sidebar-warning-list">
            {warnings.map((warning, index) => (
              <article className="sidebar-warning-item" key={`${displayText(warning.detail)}-${index}`}>
                <AlertTriangle aria-hidden="true" size={18} />
                <p>{warning.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <SidebarPageCard Icon={CheckCircle2} title={t("summary.none")} detail={t("historyPage.noWarnings")} status="ready" t={t} />
        )}
      </DetailSection>
      <SourceBoundary data={data} t={t} />
    </section>
  );
}

function SourceBoundary({ data, t }) {
  const displayPolicy = displayDepthPolicyForData(data);
  const displayDepth = displayPolicy.depth;
  const files = asArray(data.source_files);
  const commands = asArray(data.source_commands);
  const productFiles = files.filter((value) => displayText(value, "").startsWith("product:"));
  const rootFiles = files.filter((value) => !displayText(value, "").startsWith("product:"));
  const productCommands = commands.filter((value) => /(\[absolute-path\]|--context|check_git_sync|check_ci_status|product-security)/.test(displayText(value, "")));
  const rootCommands = commands.filter((value) => !productCommands.includes(value));
  return (
    <details className="source-boundary" aria-label={t("aria.dataBoundary")} data-dashboard-display-depth={displayDepth} open={displayPolicy.sourceBoundaryDefaultOpen}>
      <summary className="source-boundary__head">
        <FileText aria-hidden="true" size={22} />
        <div>
          <h3>{t("maintenance.dataRoot.title")}</h3>
          <p>{t("maintenance.dataRoot.detail")}</p>
        </div>
        <span className="source-boundary__summary-action">{t("maintenance.dataRoot.open")}</span>
      </summary>
      <div className="source-boundary__grid">
        <div>
          <FileText aria-hidden="true" size={20} />
          <div>
            <strong>{t("app.sourceFiles")}</strong>
            <p className="source-boundary__role">{t("maintenance.sourceFilesRole")}</p>
            <SourceBoundaryChips values={rootFiles} t={t} limit={3} variant="files" labelKey="maintenance.sourceFileItem" tooltipKey="maintenance.sourceFileTooltip" />
          </div>
        </div>
        {productFiles.length ? (
          <div>
            <Database aria-hidden="true" size={20} />
            <div>
              <strong>{t("maintenance.productSourceFiles")}</strong>
              <p className="source-boundary__role">{t("maintenance.productSourceFilesRole")}</p>
              <SourceBoundaryChips values={productFiles} t={t} limit={8} variant="files" labelKey="maintenance.sourceFileItem" tooltipKey="maintenance.sourceFileTooltip" />
            </div>
          </div>
        ) : null}
        <div>
          <Copy aria-hidden="true" size={20} />
          <div>
            <strong>{t("app.sourceCommands")}</strong>
            <p className="source-boundary__role">{t("maintenance.sourceCommandsRole")}</p>
            <SourceBoundaryChips values={rootCommands} t={t} limit={2} variant="commands" labelKey="maintenance.sourceCommandItem" tooltipKey="maintenance.sourceCommandTooltip" />
          </div>
        </div>
        {productCommands.length ? (
          <div>
            <TerminalSquare aria-hidden="true" size={20} />
            <div>
              <strong>{t("maintenance.productSourceCommands")}</strong>
              <p className="source-boundary__role">{t("maintenance.productSourceCommandsRole")}</p>
              <SourceBoundaryChips values={productCommands} t={t} limit={4} variant="commands" labelKey="maintenance.sourceCommandItem" tooltipKey="maintenance.sourceCommandTooltip" />
            </div>
          </div>
        ) : null}
        <div>
          <Lock aria-hidden="true" size={20} />
          <div>
            <strong>{t("detail.readOnlyShort")}</strong>
            <p>{t("detail.readOnlySourceBoundary")}</p>
          </div>
        </div>
      </div>
    </details>
  );
}

function Sidebar({ activeView, t, data, locale, loaded }) {
  const sidebarRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeItem = allNavigation.find((item) => item.id === activeView) || navigation[0];
  const ActiveIcon = activeItem.Icon || Home;

  useEffect(() => {
    const activeLink = sidebarRef.current?.querySelector(".category-nav__link.is-active");
    if (!activeLink) {
      return;
    }
    activeLink.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeView]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView]);

  return (
    <aside className={`app-sidebar app-sidebar--${activeView}${isMobileMenuOpen ? " is-mobile-open" : ""}`} aria-label={t("aria.categories")} ref={sidebarRef}>
      <div className="sidebar-topline">
        <div className="brand">
          <BrandMark />
          <div>
            <strong>{t("app.title")}</strong>
            <span>{t("app.eyebrow")}</span>
          </div>
        </div>
        <button className="mobile-menu-toggle" type="button" aria-expanded={isMobileMenuOpen} aria-controls="sidebar-menu-panel" onClick={() => setIsMobileMenuOpen((current) => !current)}>
          {isMobileMenuOpen ? <CircleX aria-hidden="true" size={17} /> : <List aria-hidden="true" size={17} />}
          <span>{isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}</span>
        </button>
      </div>
      <div className="mobile-current-page" aria-label={t("nav.currentPage")}>
        <ActiveIcon aria-hidden="true" size={17} />
        <span>{activeView === "overview" ? t("nav.overviewDetail") : t(activeItem.labelKey)}</span>
      </div>
      <div className="sidebar-menu-panel" id="sidebar-menu-panel">
        <nav className="category-nav" aria-label={t("aria.categories")}>
          {navigation.map(({ id, labelKey, Icon }) => (
            <a className={activeView === id ? "category-nav__link is-active" : "category-nav__link"} href={`#${id}`} aria-current={activeView === id ? "page" : undefined} key={id}>
              <Icon aria-hidden="true" size={18} />
              <span>{id === "overview" ? t("nav.overviewDetail") : t(labelKey)}</span>
            </a>
          ))}
        </nav>
        <nav className="support-nav" aria-label={t("nav.repositoryGroup")}>
          <h3>{t("nav.repositoryGroup")}</h3>
          {repositoryNavigation.map(({ id, labelKey, Icon, href }) => (
            <a className={activeView === id ? "category-nav__link category-nav__link--subtle is-active" : "category-nav__link category-nav__link--subtle"} href={href} aria-current={activeView === id ? "page" : undefined} key={id}>
              <Icon aria-hidden="true" size={18} />
              <span>{t(labelKey)}</span>
            </a>
          ))}
        </nav>
        <nav className="support-nav" aria-label={t("nav.otherGroup")}>
          <h3>{t("nav.otherGroup")}</h3>
          {supportNavigation.map(({ id, labelKey, Icon, href }) => (
            <a className={activeView === id ? "category-nav__link category-nav__link--subtle is-active" : "category-nav__link category-nav__link--subtle"} href={href} aria-current={activeView === id ? "page" : undefined} key={id}>
              <Icon aria-hidden="true" size={18} />
              <span>{t(labelKey)}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-meta">
          <div className="sidebar-note">
            <Info aria-hidden="true" size={16} />
            <span>{t("sidebar.readOnlyNotice")}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" aria-hidden="true" viewBox="0 0 32 36" width="32" height="36" fill="none">
      <path d="M16 2.5 29 8v9.5c0 8.2-5.2 13.1-13 16-7.8-2.9-13-7.8-13-16V8l13-5.5Z" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 9.5v12M10 15.5h12" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M22.5 8.5 24 11l2.5 1.5L24 14l-1.5 2.5L21 14l-2.5-1.5L21 11l1.5-2.5Z" fill="currentColor" />
    </svg>
  );
}

function resolveRefreshIntervalMs() {
  const defaultRefreshMs = 3000;
  const params = new URLSearchParams(window.location.search);
  // Test-only override for deterministic Playwright refresh assertions.
  const requested = Number(params.get("refresh_ms"));
  if (Number.isFinite(requested) && requested >= 100) {
    return Math.min(requested, 60000);
  }
  return defaultRefreshMs;
}

function resolveContextSwitchFallbackMs() {
  const params = new URLSearchParams(window.location.search);
  const requested = Number(params.get("context_switch_fallback_ms"));
  if (Number.isFinite(requested) && requested >= 300) {
    return Math.min(requested, 30000);
  }
  return CONTEXT_SWITCH_FALLBACK_MS;
}

function SyncBanner({ error, t }) {
  if (!error) {
    return null;
  }
  const message = displayText(error.message, "");
  const detail = /timed out/i.test(message) ? t("app.refreshIssueTimeout") : t("app.refreshIssueDetail");
  return (
    <div className="sync-banner" role="status">
      <AlertTriangle aria-hidden="true" size={18} />
      <span>{t("app.refreshIssue")}</span>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function ContextSwitchFailureNotice({ failure, activeMenuId, t }) {
  const failedMenuId = displayText(failure?.menuId, "");
  const currentMenuId = displayText(activeMenuId, "");
  if (!failure || !failedMenuId || failedMenuId === currentMenuId) {
    return null;
  }
  const message = displayText(failure.message, "");
  const detail = /timed out/i.test(message) ? t("context.switchFailure.timeoutDetail") : t("context.switchFailure.genericDetail");
  return (
    <div className="context-switch-failure" role="status" aria-live="polite">
      <AlertTriangle aria-hidden="true" size={18} />
      <div>
        <strong>{t("context.switchFailure.title")} {contextLabel(failedMenuId, t)}</strong>
        <span>{t("context.switchFailure.detail")} {contextLabel(activeMenuId, t)}</span>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

function ContextSwitchProgressStep({ state, children }) {
  const normalizedState = displayText(state, "pending");
  const Icon = normalizedState === "complete" ? Check : normalizedState === "active" ? RefreshCw : CircleDashed;
  return (
    <li className={`context-switch-progress__step context-switch-progress__step--${normalizedState}`}>
      <span className="context-switch-progress__step-icon">
        <Icon aria-hidden="true" size={13} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function ContextSwitchProgressPopup({ pendingMenuId, activeMenuId, data, t, progress }) {
  const pending = displayText(pendingMenuId, "");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!pending) {
      setElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const timerId = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [pending]);

  if (!pending) {
    return null;
  }

  const pendingContext = contextDataForMenu(data, pending) || availableContextForMenu(data, pending) || {};
  const targetRepository = repositoryDisplayName(pendingContext.target_repository?.name || pendingContext.target_repository_name, t);
  const snapshotStepState = progress?.snapshotReady ? "complete" : "active";
  const applyStepState = progress?.viewApplied ? "complete" : progress?.snapshotReady ? "active" : "pending";
  return (
    <div className="context-switch-progress" role="status" aria-live="polite" aria-atomic="true">
      <div className="context-switch-progress__panel" aria-busy="true">
        <div className="context-switch-progress__header">
          <span className="context-switch-progress__spinner" aria-hidden="true">
            <RefreshCw size={24} />
          </span>
          <div>
            <p className="context-switch-progress__eyebrow">{t("context.switchProgress.eyebrow")}</p>
            <h2>{t("context.switchProgress.title")}</h2>
            <p>{t("context.switchProgress.detail")}</p>
          </div>
        </div>
        <dl className="context-switch-progress__summary">
          <div>
            <dt>{t("context.switchProgress.currentMenu")}</dt>
            <dd>{contextLabel(activeMenuId, t)}</dd>
          </div>
          <div>
            <dt>{t("context.switchProgress.nextMenu")}</dt>
            <dd>{contextLabel(pending, t)}</dd>
          </div>
          <div>
            <dt>{t("context.switchProgress.targetRepository")}</dt>
            <dd>{targetRepository}</dd>
          </div>
        </dl>
        <div className="context-switch-progress__bar" aria-hidden="true">
          <span />
        </div>
        <ol className="context-switch-progress__steps" aria-label={t("context.switchProgress.stepsLabel")}>
          <ContextSwitchProgressStep state="complete">{t("context.switchProgress.stepRequested")}</ContextSwitchProgressStep>
          <ContextSwitchProgressStep state={snapshotStepState}>{progress?.fallbackApplied ? t("context.switchProgress.stepRefreshingSlow") : t("context.switchProgress.stepRefreshing")}</ContextSwitchProgressStep>
          <ContextSwitchProgressStep state={applyStepState}>{t("context.switchProgress.stepPreparing")}</ContextSwitchProgressStep>
        </ol>
        <p className="context-switch-progress__elapsed">
          {t("context.switchProgress.elapsedPrefix")} {elapsedSeconds} {t("context.switchProgress.elapsedSuffix")}
        </p>
      </div>
    </div>
  );
}

function ContextSwitchHoldingPage({ pendingMenuId, t }) {
  const pending = displayText(pendingMenuId, "");
  return (
    <section className="view-surface context-switch-holding" aria-live="polite" aria-label={t("context.menuAvailability.waitTitle")}>
      <div className="context-switch-holding__icon">
        <RefreshCw aria-hidden="true" size={28} />
      </div>
      <div>
        <h2>{t("context.menuAvailability.waitTitle")}</h2>
        <p>{t("context.menuAvailability.waitDetail")} {contextLabel(pending, t)}</p>
      </div>
    </section>
  );
}

function snapshotLocaleForHint(snapshotData) {
  const summary = snapshotData?.summary || {};
  const configuredLocale = displayText(summary.ui_locale || summary.display_locale || summary.workflow_language, "");
  return configuredLocale ? resolveLocale([configuredLocale, "en"]) : "";
}

export default function App() {
  const initialActiveMenuIdRef = useRef(null);
  if (initialActiveMenuIdRef.current === null) {
    initialActiveMenuIdRef.current = initialDashboardMenuId();
  }
  const [state, setState] = useState({ status: "loading", data: null, error: null, refreshError: null, signature: "" });
  const [activeView, setActiveView] = useState(viewFromHash);
  const [activeMenuId, setActiveMenuId] = useState(() => initialActiveMenuIdRef.current);
  const [pendingMenuId, setPendingMenuId] = useState("");
  const [contextSwitchFailure, setContextSwitchFailure] = useState(null);
  const [contextSwitchProgress, setContextSwitchProgress] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const activeMenuIdRef = useRef(initialActiveMenuIdRef.current);
  const pendingMenuIdRef = useRef("");
  const backgroundRefreshMenuIdRef = useRef("");
  const firstSnapshotLoadedRef = useRef(false);
  const [localeHint, setLocaleHint] = useState("");
  const locale = useMemo(() => {
    const summary = state.data?.summary || {};
    const configuredLocale = displayText(localeHint || summary.ui_locale || summary.display_locale || summary.workflow_language, "");
    if (configuredLocale) {
      return resolveLocale([configuredLocale, "en"]);
    }
    return resolveLocale([summary.environment_locale, ...(Array.isArray(navigator.languages) ? navigator.languages : [navigator.language])]);
  }, [localeHint, state.data]);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const htmlLang = useMemo(() => getDashboardIntlLocale(locale), [locale]);
  const htmlDirection = useMemo(() => getDashboardLocaleDirection(locale), [locale]);
  const refreshIntervalMs = useMemo(() => resolveRefreshIntervalMs(), []);
  const contextSwitchFallbackMs = useMemo(() => resolveContextSwitchFallbackMs(), []);
  useEffect(() => {
    document.documentElement.lang = htmlLang;
    document.documentElement.dir = htmlDirection;
  }, [htmlLang, htmlDirection]);
  const publishSnapshot = useCallback((snapshot) => {
    setLocaleHint((previous) => {
      if (!previous) {
        return "";
      }
      return snapshotLocaleForHint(snapshot.data) === previous ? "" : previous;
    });
    setState((previous) => {
      if (previous.signature === snapshot.signature && previous.data) {
        return { ...previous, status: "ready", error: null, refreshError: null };
      }
      return { status: "ready", data: snapshot.data, error: null, refreshError: null, signature: snapshot.signature };
    });
  }, []);
  const publishSnapshotError = useCallback((error) => {
    setState((previous) => {
      if (previous.data) {
        return { ...previous, status: "stale", error: null, refreshError: error };
      }
      return { status: "failed", data: null, error, refreshError: null, signature: "" };
    });
  }, []);
  const snapshotMatchesActiveMenu = useCallback((snapshot, requestedMenuId = "") => {
    const expectedMenuId = displayText(requestedMenuId || activeMenuIdRef.current, "");
    if (!expectedMenuId) {
      return true;
    }
    return producerMenuIdForData(snapshot?.data || {}) === expectedMenuId;
  }, []);
  const refreshSnapshotNow = useCallback(async (options = {}) => {
    if (options.clearLocaleHint) {
      setLocaleHint("");
    }
    const immediateLocale = displayText(options.localeHint?.ui_locale || options.localeHint?.display_locale || options.localeHint?.workflow_language, "");
    if (immediateLocale) {
      setLocaleHint(resolveLocale([immediateLocale, "en"]));
    }
    if (options.immediateOnly) {
      return null;
    }
    try {
      const savedSnapshotOnly = Boolean(options.savedSnapshotOnly);
      const requestedMenuId = savedSnapshotOnly ? "" : displayText(options.menuId || activeMenuIdRef.current, "");
      const snapshot = await fetchDashboardDataSnapshot(requestedMenuId ? { menuId: requestedMenuId } : {});
      if (!savedSnapshotOnly && !snapshotMatchesActiveMenu(snapshot, requestedMenuId)) {
        throw new Error(`dashboard data menu mismatch: requested ${requestedMenuId || "current"}, received ${producerMenuIdForData(snapshot?.data || {})}`);
      }
      publishSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (!options.suppressRefreshError) {
        publishSnapshotError(error);
      }
      throw error;
    }
  }, [publishSnapshot, publishSnapshotError, snapshotMatchesActiveMenu]);

  const rawData = state.data || {};
  const loaded = Boolean(state.data) && (state.status === "ready" || state.status === "stale");
  const producerMenuId = useMemo(() => producerMenuIdForData(rawData), [rawData]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const requestedMenuId = displayText(activeMenuIdRef.current || initialActiveMenuIdRef.current, "");
    const nextMenuId = resolveActiveMenuId(rawData, requestedMenuId || producerMenuId);
    setActiveMenuId((currentMenuId) => {
      return currentMenuId === nextMenuId ? currentMenuId : nextMenuId;
    });
    if (nextMenuId) {
      activeMenuIdRef.current = nextMenuId;
      persistDashboardMenuId(nextMenuId);
    }
  }, [loaded, producerMenuId, rawData, state.signature]);

  useEffect(() => {
    activeMenuIdRef.current = activeMenuId;
    setLiveStatus((previous) => (displayText(previous?.menu_id, "") === activeMenuId ? previous : null));
  }, [activeMenuId]);

  useEffect(() => {
    if (!loaded) {
      return undefined;
    }
    let active = true;
    let inFlight = false;
    let timerId = 0;

    async function loadLiveStatus() {
      if (inFlight) {
        return;
      }
      const menuId = displayText(activeMenuIdRef.current, "");
      if (!menuId) {
        return;
      }
      inFlight = true;
      try {
        const nextLiveStatus = await fetchDashboardLiveStatus({ menuId });
        if (!active || displayText(activeMenuIdRef.current, "") !== displayText(nextLiveStatus.menu_id, "")) {
          return;
        }
        setLiveStatus(nextLiveStatus);
      } catch {
        if (!active) {
          return;
        }
        setLiveStatus((previous) => (displayText(previous?.menu_id, "") === menuId ? previous : null));
      } finally {
        inFlight = false;
      }
    }

    loadLiveStatus();
    timerId = window.setInterval(loadLiveStatus, refreshIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [loaded, refreshIntervalMs, activeMenuId]);

  const clearContextSwitchPending = useCallback((menuId, delayMs = 0) => {
    window.setTimeout(() => {
      if (pendingMenuIdRef.current !== menuId) {
        return;
      }
      pendingMenuIdRef.current = "";
      setPendingMenuId("");
      setContextSwitchProgress(null);
    }, delayMs);
  }, []);

  const applyMenuFromSnapshotData = useCallback((snapshotData, menuId, options = {}) => {
    const requestedMenuId = displayText(menuId, "");
    const nextMenuId = resolveActiveMenuId(snapshotData, requestedMenuId);
    if (!requestedMenuId || nextMenuId !== requestedMenuId) {
      return false;
    }
    activeMenuIdRef.current = nextMenuId;
    setActiveMenuId(nextMenuId);
    setContextSwitchFailure(null);
    setContextSwitchProgress({
      menuId: nextMenuId,
      snapshotReady: !options.fallbackApplied,
      viewApplied: true,
      fallbackApplied: Boolean(options.fallbackApplied),
    });
    persistDashboardMenuId(nextMenuId);
    return true;
  }, []);

  const handleActiveMenuChange = useCallback(
    (menuId) => {
      const resolvedMenuId = resolveActiveMenuId(rawData, menuId);
      if (!resolvedMenuId || !isMenuSelectable(rawData, resolvedMenuId)) {
        return;
      }
      if (resolvedMenuId === producerMenuIdForData(rawData)) {
        activeMenuIdRef.current = resolvedMenuId;
        pendingMenuIdRef.current = "";
        setPendingMenuId("");
        setContextSwitchFailure(null);
        setContextSwitchProgress(null);
        setActiveMenuId(resolvedMenuId);
        persistDashboardMenuId(resolvedMenuId);
        return;
      }
      pendingMenuIdRef.current = resolvedMenuId;
      setContextSwitchFailure(null);
      setContextSwitchProgress({ menuId: resolvedMenuId, snapshotReady: false, viewApplied: false, fallbackApplied: false });
      setPendingMenuId(resolvedMenuId);
      const fallbackTimerId = window.setTimeout(() => {
        if (pendingMenuIdRef.current !== resolvedMenuId) {
          return;
        }
        if (applyMenuFromSnapshotData(rawData, resolvedMenuId, { fallbackApplied: true })) {
          backgroundRefreshMenuIdRef.current = resolvedMenuId;
          clearContextSwitchPending(resolvedMenuId, CONTEXT_SWITCH_COMPLETE_HOLD_MS);
        }
      }, contextSwitchFallbackMs);
      void refreshSnapshotNow({ menuId: resolvedMenuId, suppressRefreshError: true })
        .then((snapshot) => {
          window.clearTimeout(fallbackTimerId);
          if (snapshot?.data && snapshotMatchesActiveMenu(snapshot, resolvedMenuId)) {
            applyMenuFromSnapshotData(snapshot.data, resolvedMenuId);
          }
        })
        .catch((error) => {
          window.clearTimeout(fallbackTimerId);
          if (pendingMenuIdRef.current === resolvedMenuId) {
            setContextSwitchFailure({ menuId: resolvedMenuId, message: displayText(error?.message, "") });
          }
        })
        .finally(() => {
          if (backgroundRefreshMenuIdRef.current === resolvedMenuId) {
            backgroundRefreshMenuIdRef.current = "";
          }
          clearContextSwitchPending(resolvedMenuId, CONTEXT_SWITCH_COMPLETE_HOLD_MS);
        });
    },
    [applyMenuFromSnapshotData, clearContextSwitchPending, contextSwitchFallbackMs, rawData, refreshSnapshotNow, snapshotMatchesActiveMenu],
  );

  const activeDashboard = useMemo(() => resolveActiveDashboardData(rawData, activeMenuId), [rawData, activeMenuId]);
  const data = loaded ? activeDashboard.data : rawData;
  const isContextSwitching = Boolean(displayText(pendingMenuId, ""));
  const evidenceViewNeedsCurrentSnapshot = loaded && evidenceBackedViews.has(activeView) && !activeDashboard.isProducerContext;

  useEffect(() => {
    function handleHashChange() {
      setActiveView(viewFromHash());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let timerId = 0;

    async function loadSnapshot() {
      if (inFlight) {
        return;
      }
      if (pendingMenuIdRef.current || backgroundRefreshMenuIdRef.current) {
        return;
      }
      inFlight = true;
      try {
        const menuId = displayText(activeMenuIdRef.current, "");
        const firstSnapshotLoad = !firstSnapshotLoadedRef.current;
        const snapshot = await fetchDashboardDataSnapshot({});
        if (!active) {
          return;
        }
        firstSnapshotLoadedRef.current = true;
        if (pendingMenuIdRef.current || displayText(activeMenuIdRef.current, "") !== menuId) {
          if (!firstSnapshotLoad) {
            return;
          }
        }
        publishSnapshot(snapshot);
        if (firstSnapshotLoad && menuId) {
          const selectedMenuNeedsLiveRefresh = menuId !== producerMenuIdForData(snapshot.data);
          const appliedFromSnapshot = applyMenuFromSnapshotData(snapshot.data, menuId, { fallbackApplied: selectedMenuNeedsLiveRefresh });
          if (!selectedMenuNeedsLiveRefresh) {
            return;
          }
          if (!appliedFromSnapshot) {
            return;
          }
          backgroundRefreshMenuIdRef.current = menuId;
          void fetchDashboardDataSnapshot({ menuId })
            .then((selectedSnapshot) => {
              if (!active) {
                return;
              }
              if (!snapshotMatchesActiveMenu(selectedSnapshot, menuId)) {
                throw new Error(`dashboard data menu mismatch: requested ${menuId}, received ${producerMenuIdForData(selectedSnapshot?.data || {})}`);
              }
              applyMenuFromSnapshotData(selectedSnapshot.data, menuId);
              publishSnapshot(selectedSnapshot);
            })
            .catch((error) => {
              if (!active) {
                return;
              }
              if (displayText(activeMenuIdRef.current, "") !== menuId) {
                publishSnapshotError(error);
                setContextSwitchFailure({ menuId, message: displayText(error?.message, "") });
              }
            })
            .finally(() => {
              if (backgroundRefreshMenuIdRef.current === menuId) {
                backgroundRefreshMenuIdRef.current = "";
              }
            });
        }
      } catch (error) {
        if (!active) {
          return;
        }
        firstSnapshotLoadedRef.current = true;
        const failedPendingMenuId = displayText(pendingMenuIdRef.current, "");
        if (failedPendingMenuId && displayText(activeMenuIdRef.current, "") !== failedPendingMenuId) {
          setContextSwitchFailure({ menuId: failedPendingMenuId, message: displayText(error?.message, "") });
          clearContextSwitchPending(failedPendingMenuId, CONTEXT_SWITCH_COMPLETE_HOLD_MS);
        }
        publishSnapshotError(error);
      } finally {
        inFlight = false;
      }
    }

    loadSnapshot();
    timerId = window.setInterval(loadSnapshot, refreshIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [applyMenuFromSnapshotData, clearContextSwitchPending, publishSnapshot, publishSnapshotError, refreshIntervalMs, snapshotMatchesActiveMenu]);

  useEffect(() => {
    function handleManualSnapshotRefresh() {
      pendingMenuIdRef.current = "";
      setPendingMenuId("");
      setContextSwitchProgress(null);
      void refreshSnapshotNow({ savedSnapshotOnly: true }).catch(() => {});
    }
    window.addEventListener("dashboard-control-center:refresh", handleManualSnapshotRefresh);
    return () => {
      window.removeEventListener("dashboard-control-center:refresh", handleManualSnapshotRefresh);
    };
  }, [refreshSnapshotNow]);

  return (
    <main className="app-shell" lang={htmlLang} dir={htmlDirection} data-dcc-design-system="dashboard-control-center">
      <Sidebar activeView={activeView} t={t} data={data} locale={locale} loaded={loaded} />
      <section className="app-main" aria-busy={isContextSwitching ? "true" : undefined}>
        <h1 className="sr-only">{t("app.title")}</h1>
        <ContextSwitchProgressPopup pendingMenuId={pendingMenuId} activeMenuId={activeDashboard.activeMenuId} data={data} t={t} progress={contextSwitchProgress} />
        <ContextSwitchFailureNotice failure={contextSwitchFailure} activeMenuId={activeDashboard.activeMenuId} t={t} />
        <SyncBanner error={loaded ? state.refreshError : null} t={t} />

        {state.status === "loading" ? (
          <section className="view-surface" aria-label="Loading">
            <p>{t("app.loading")}</p>
          </section>
        ) : null}

        {state.status === "failed" ? (
          <section className="view-surface" aria-label="Data unavailable">
            <div className="view-header">
              <div>
                <AlertTriangle aria-hidden="true" size={22} />
                <h2>{t("app.dataUnavailable")}</h2>
              </div>
              <p>{displayText(state.error?.message)}</p>
            </div>
          </section>
        ) : null}

        {loaded && activeView === "overview" ? <OverviewSection data={data} t={t} locale={locale} activeMenuId={activeDashboard.activeMenuId} pendingMenuId={pendingMenuId} onActiveMenuChange={handleActiveMenuChange} liveStatus={liveStatus} /> : null}
        {loaded && activeView === "lessons" ? <LessonSection lessons={data.lessons || {}} data={data} locale={locale} t={t} /> : null}
        {loaded && evidenceViewNeedsCurrentSnapshot ? <ContextSwitchHoldingPage pendingMenuId={activeDashboard.activeMenuId} t={t} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "workflow" ? <WorkflowSection development={data.development || {}} gitWorkflow={data.git_workflow || {}} data={data} locale={locale} t={t} liveStatus={liveStatus} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "maintenance" ? <MaintenanceSection maintenance={data.maintenance || {}} data={data} locale={locale} t={t} liveStatus={liveStatus} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "safety" ? <SafetySection security={data.security || {}} actions={data.actions || {}} partialFailures={data.partial_failures || []} data={data} locale={locale} t={t} liveStatus={liveStatus} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "repository-info" ? <RepositoryInfoPage data={data} locale={locale} t={t} liveStatus={liveStatus} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "documents" ? <DocumentsPage data={data} locale={locale} t={t} /> : null}
        {loaded && activeView === "settings" ? <SettingsPage data={data} locale={locale} t={t} onRefreshSnapshot={refreshSnapshotNow} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "design-studio" ? <DesignStudioPage data={data} locale={locale} t={t} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "help" ? <HelpPage data={data} locale={locale} t={t} /> : null}
        {loaded && !evidenceViewNeedsCurrentSnapshot && activeView === "history" ? <HistoryPage data={data} locale={locale} t={t} /> : null}
      </section>
    </main>
  );
}
