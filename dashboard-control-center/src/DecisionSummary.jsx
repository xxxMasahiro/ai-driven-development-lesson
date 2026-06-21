import {
  ArrowRightCircle,
  BadgeAlert,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleHelp,
  CircleMinus,
  CircleX,
  Clock,
  Eye,
  Info,
  RefreshCw,
  Target,
  UserCheck,
} from "lucide-react";

import { asArray, displayText, normalizeState, stateLabelKey } from "./dashboardData.js";
import { displayDepthPolicyForData } from "./displayDepth.js";

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

function statusLabelForChip(value, t) {
  const state = normalizeState(value);
  return t(stateLabelKey(state), displayText(state));
}

function technicalReferenceItems(values) {
  return asArray(values).map((value) => displayText(value, "")).filter(Boolean);
}

export function DetailDecisionSummary({ tone, items, t, displayPolicy = null }) {
  return (
    <section className={`decision-summary decision-summary--${tone}`} aria-label={t("detail.summaryAria")}>
      {items.map(({ Icon, label, value, valueLines, detail, points = [], badge, cta, tone: itemTone, technicalReferences = [] }) => {
        const references = technicalReferenceItems(technicalReferences);
        const showTechnicalReferences = Boolean(displayPolicy?.renderDecisionTechnicalReferenceDisclosure && references.length);
        return (
          <article className={itemTone ? `decision-summary__item decision-summary__item--${itemTone}` : "decision-summary__item"} key={label}>
            <span className="decision-summary__icon">
              <Icon aria-hidden="true" size={24} />
            </span>
            <div>
              <span>{label}</span>
              {valueLines?.length ? (
                <p className="decision-summary__value-lines">
                  {valueLines.map((line, index) => (
                    <span key={`${displayText(line)}-${index}`}>{line}</span>
                  ))}
                </p>
              ) : displayText(value, "") ? (
                <strong>{value}</strong>
              ) : null}
              {badge ? <em>{badge}</em> : null}
              {detail ? <p>{detail}</p> : null}
              {points.length ? (
                <ul className="decision-summary__points">
                  {points.map((point, index) => (
                    <li key={`${displayText(point)}-${index}`}>{displayText(point)}</li>
                  ))}
                </ul>
              ) : null}
              {showTechnicalReferences ? (
                <details className="decision-summary__technical" data-dashboard-display-depth={displayPolicy.depth} open={displayPolicy.openTechnicalDetails}>
                  <summary>{t("settingsPage.modal.technicalDetails")}</summary>
                  <ul className="decision-summary__points">
                    {references.map((reference, index) => (
                      <li key={`${reference}-${index}`}>{reference}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {cta ? (
                <a className="decision-summary__cta" href={cta.href}>
                  {cta.label}
                  <ArrowRightCircle aria-hidden="true" size={16} />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function decisionPageFor(data, pageId) {
  return asArray(data?.decision_pages).find((page) => displayText(page?.id, "") === pageId) || null;
}

const decisionTextKeysByRawValue = {
  "Can the current dashboard snapshot be used as the next development decision summary?": "decisionPage.overview.decision_question",
  "Which lesson path or approval state needs attention before learning continues?": "decisionPage.lessons.decision_question",
  "Can the selected development workflow safely continue?": "decisionPage.workflow.decision_question",
  "Are synchronized documents and evidence current enough to rely on?": "decisionPage.maintenance.decision_question",
  "Are blockers, approvals, and dangerous-operation boundaries clear enough to proceed?": "decisionPage.safety.decision_question",
  "Is the selected repository context clear enough for the next operation?": "decisionPage.repository-info.decision_question",
  "Which document should be reviewed for the current decision?": "decisionPage.documents.decision_question",
  "Which guarded setting can be reviewed without changing workflow authority?": "decisionPage.settings.decision_question",
  "Is the recorded evidence recent enough for this decision?": "decisionPage.history.decision_question",
  "Required evidence is missing.": "decisionPage.status.missing.current_judgment",
  "A required repository, document, or evidence source is missing.": "decisionPage.status.missing.top_reason",
  "Open Repository Info or Documents to identify the missing source before proceeding.": "decisionPage.overview.next_safe_action",
};

function decisionFallbackText(value, t) {
  const text = displayText(value, "");
  const key = decisionTextKeysByRawValue[text];
  return key ? t(key, text) : text;
}

function decisionText(decision, field, t) {
  const id = displayText(decision?.id, "unknown");
  const state = normalizeState(decision?.status);
  const explicitKey = displayText(decision?.[`${field}_key`], "");
  const pageKey = `decisionPage.${id}.${field}`;
  const statusKey = `decisionPage.status.${state}.${field}`;
  const fallback = decisionFallbackText(decision?.[field], t);
  if (explicitKey) {
    return t(explicitKey, t(pageKey, t(statusKey, fallback)));
  }
  return t(pageKey, t(statusKey, fallback));
}

function decisionEvidenceConfidence(decision, t) {
  const explicitKey = displayText(decision?.evidence_confidence_key, "");
  const authority = displayText(decision?.authority, "");
  const freshness = displayText(decision?.freshness_state, "");
  if (!authority && !freshness) {
    return decisionFallbackText(decision?.evidence_confidence, t);
  }
  const authorityLabel = authority ? t(`decisionPage.authority.${authority}`, displayText(authority)) : "";
  const freshnessLabel = freshness ? t(`decisionPage.freshness.${freshness}`, displayText(freshness)) : "";
  const localized = [authorityLabel, freshnessLabel].filter(Boolean).join(" / ");
  const confidenceKey = `decisionPage.evidenceConfidence.${authority || "unknown"}.${freshness || "unknown"}`;
  return explicitKey ? t(explicitKey, t(confidenceKey, localized)) : t(confidenceKey, localized);
}

function decisionMustReviewLabel(value, t, explicitKey = "") {
  const text = displayText(value, "");
  const key = displayText(explicitKey, "");
  if (key) {
    return t(key, text);
  }
  const keyByText = {
    "Top blocker": "decisionPage.mustReview.topBlocker",
    "Evidence confidence": "decisionPage.mustReview.evidenceConfidence",
    "Current step": "decisionPage.mustReview.currentStep",
    "Next learning action": "decisionPage.mustReview.nextLearningAction",
    "Git and CI state": "decisionPage.mustReview.gitCiState",
    "Approval gates": "decisionPage.mustReview.approvalGates",
    "Synchronized docs": "decisionPage.mustReview.synchronizedDocs",
    "Evidence rows": "decisionPage.mustReview.evidenceRows",
    Approvals: "decisionPage.mustReview.approvals",
    "Dangerous operations": "decisionPage.mustReview.dangerousOperations",
    "Worktree changes": "decisionPage.mustReview.worktreeChanges",
    "Ahead/behind state": "decisionPage.mustReview.aheadBehindState",
    Audience: "decisionPage.mustReview.audience",
    "Status source": "decisionPage.mustReview.statusSource",
    "Current value": "decisionPage.mustReview.currentValue",
    Consistency: "decisionPage.mustReview.consistency",
    "Observed time": "decisionPage.mustReview.observedTime",
    "Source identity": "decisionPage.mustReview.sourceIdentity",
  };
  return keyByText[text] ? t(keyByText[text], text) : text;
}

function decisionToneForStatus(status) {
  const state = normalizeState(status);
  if (state === "ready" || state === "passed" || state === "not_applicable") {
    return "ready";
  }
  if (state === "blocked" || state === "failed") {
    return "danger";
  }
  return "warning";
}

export function ProducerDecisionSummary({ data, pageId, tone = "sidebar", t }) {
  const decision = decisionPageFor(data, pageId);
  if (!decision) {
    return null;
  }
  const policy = displayDepthPolicyForData(data);
  const state = normalizeState(decision.status);
  const StateIcon = stateIcons[state] || CircleHelp;
  const mustReviewKeys = asArray(decision.must_review_keys);
  const mustReview = asArray(decision.must_review).map((item, index) => decisionMustReviewLabel(item, t, mustReviewKeys[index])).filter(Boolean);
  const evidenceConfidence = decisionEvidenceConfidence(decision, t);
  const technicalReferences = [
    displayText(decision.source_id, ""),
    displayText(decision.owner_source, ""),
    displayText(decision.detail_page, ""),
    displayText(decision.authority, ""),
    displayText(decision.freshness_state, ""),
  ].filter(Boolean);
  const visibleSourceDetail = [
    displayText(decision.owner_source, ""),
    displayText(decision.detail_page, ""),
  ].filter(Boolean).join(" / ");
  return (
    <DetailDecisionSummary
      tone={tone}
      t={t}
      displayPolicy={policy}
      items={[
        { Icon: Target, label: t("detail.checks"), value: decisionText(decision, "decision_question", t), detail: displayText(decision.scope, "") },
        { Icon: StateIcon, label: t("detail.currentJudgment"), value: decisionText(decision, "current_judgment", t), detail: decisionText(decision, "top_reason", t), badge: statusLabelForChip(state, t), tone: decisionToneForStatus(state) },
        { Icon: Eye, label: t("detail.mustReview"), points: mustReview.length ? mustReview : [t("detail.noRequiredReview")], detail: evidenceConfidence },
        { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: decisionText(decision, "next_safe_action", t), detail: visibleSourceDetail, technicalReferences },
      ]}
    />
  );
}
