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
  const renderFoldedTechnicalReferences = isFriendly || isTechnical;
  return {
    depth,
    isFriendly,
    isStandard: depth === "standard",
    isTechnical,
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
