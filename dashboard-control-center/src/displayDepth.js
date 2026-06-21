export const DASHBOARD_DISPLAY_DEPTH_VALUES = ["friendly", "standard", "technical"];
export const DASHBOARD_DISPLAY_DEPTHS = new Set(DASHBOARD_DISPLAY_DEPTH_VALUES);
export const DEFAULT_DASHBOARD_DISPLAY_DEPTH = "standard";

export function normalizeDashboardDisplayDepth(value) {
  const text = value == null ? "" : String(value);
  return DASHBOARD_DISPLAY_DEPTHS.has(text) ? text : DEFAULT_DASHBOARD_DISPLAY_DEPTH;
}

export function dashboardDisplayDepthFromData(data) {
  return normalizeDashboardDisplayDepth(data?.summary?.display_depth);
}

export function displayDepthPolicy(value) {
  const depth = normalizeDashboardDisplayDepth(value);
  const isFriendly = depth === "friendly";
  const isTechnical = depth === "technical";
  const isStandard = depth === "standard";
  const renderFoldedTechnicalReferences = isFriendly || isTechnical;
  const audienceMode = isFriendly ? "non_engineer" : isTechnical ? "technical_engineer" : "junior_engineer";
  return {
    depth,
    audienceMode,
    audienceLabelKey: `displayDepth.audience.${audienceMode}.label`,
    audienceDetailKey: `displayDepth.audience.${audienceMode}.detail`,
    isFriendly,
    isStandard,
    isTechnical,
    usePlainLanguage: isFriendly,
    useEngineeringLanguage: isStandard || isTechnical,
    collapseTechnicalDetails: isFriendly,
    renderFoldedTechnicalReferences,
    renderDecisionTechnicalReferenceDisclosure: renderFoldedTechnicalReferences,
    openTechnicalDetails: isTechnical,
    sourceBoundaryDefaultOpen: isTechnical,
    settingsTechnicalDetailsDefaultOpen: isTechnical,
    renderCommandTechnicalDisclosure: renderFoldedTechnicalReferences,
    renderEvidenceReferenceDisclosure: renderFoldedTechnicalReferences,
  };
}

export function displayDepthPolicyForData(data) {
  return displayDepthPolicy(dashboardDisplayDepthFromData(data));
}
