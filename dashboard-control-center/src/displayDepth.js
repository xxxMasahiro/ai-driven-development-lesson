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
  return {
    depth,
    isFriendly,
    isStandard: depth === "standard",
    isTechnical,
    collapseTechnicalDetails: isFriendly,
    showDecisionTechnicalReferences: isFriendly || isTechnical,
    openTechnicalDetails: isTechnical,
    sourceBoundaryDefaultOpen: isTechnical,
    settingsTechnicalDetailsDefaultOpen: isTechnical,
    commandPreviewTechnicalDetails: isFriendly || isTechnical,
    evidenceReferenceTechnicalDetails: isFriendly || isTechnical,
  };
}

export function displayDepthPolicyForData(data) {
  return displayDepthPolicy(dashboardDisplayDepthFromData(data));
}
