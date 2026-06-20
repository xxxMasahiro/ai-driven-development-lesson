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

import { asArray, displayText, normalizeState } from "./dashboardData.js";
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
  const labels = {
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
  return t(labels[state] || `state.${state}`, displayText(state));
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
  const mustReview = asArray(decision.must_review).map((item) => displayText(item, "")).filter(Boolean);
  const evidenceConfidence = displayText(decision.evidence_confidence, "");
  const technicalReferences = [
    displayText(decision.source_id, ""),
    displayText(decision.owner_source, ""),
    displayText(decision.detail_page, ""),
    displayText(decision.authority, ""),
    displayText(decision.freshness_state, ""),
  ].filter(Boolean);
  const technicalDrilldown = technicalReferences.slice(0, 3).join(" / ");
  const nextSafeDetail = policy.isFriendly ? "" : technicalDrilldown;
  return (
    <DetailDecisionSummary
      tone={tone}
      t={t}
      displayPolicy={policy}
      items={[
        { Icon: Target, label: t("detail.checks"), value: displayText(decision.decision_question), detail: displayText(decision.scope, "") },
        { Icon: StateIcon, label: t("detail.currentJudgment"), value: displayText(decision.current_judgment), detail: displayText(decision.top_reason), badge: statusLabelForChip(state, t), tone: decisionToneForStatus(state) },
        { Icon: Eye, label: t("detail.mustReview"), points: mustReview.length ? mustReview : [t("detail.noRequiredReview")], detail: evidenceConfidence },
        { Icon: ArrowRightCircle, label: t("detail.nextSafeCheck"), value: displayText(decision.next_safe_action), detail: nextSafeDetail, technicalReferences },
      ]}
    />
  );
}
