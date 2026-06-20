import { asArray, displayText, normalizeState } from "./dashboardData.js";

const DASHBOARD_ACTIVE_MENU_STORAGE_KEY = "dashboard-control-center.activeMenuId";

export const DASHBOARD_MENU_IDS = [
  "step_1_7",
  "step_1_14",
  "advanced",
  "free-development",
  "product-improvement",
  "external-integration",
  "lesson-repository-improvement",
];

const dashboardKnownMenuIds = new Set(DASHBOARD_MENU_IDS);

export function safeDashboardMenuId(value) {
  const id = displayText(value, "");
  return dashboardKnownMenuIds.has(id) ? id : "";
}

export function dashboardMenuIdFromSearch() {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return safeDashboardMenuId(new URLSearchParams(window.location.search).get("menu_id"));
  } catch {
    return "";
  }
}

export function storedDashboardMenuId() {
  if (typeof window === "undefined" || !window.localStorage) {
    return "";
  }
  try {
    return safeDashboardMenuId(window.localStorage.getItem(DASHBOARD_ACTIVE_MENU_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function initialDashboardMenuId() {
  return dashboardMenuIdFromSearch() || storedDashboardMenuId();
}

export function persistDashboardMenuId(menuId) {
  if (typeof window === "undefined") {
    return;
  }
  const id = safeDashboardMenuId(menuId);
  try {
    if (id) {
      window.localStorage?.setItem(DASHBOARD_ACTIVE_MENU_STORAGE_KEY, id);
    } else {
      window.localStorage?.removeItem(DASHBOARD_ACTIVE_MENU_STORAGE_KEY);
    }
  } catch {
    // Browser privacy settings may block localStorage; the URL remains the source of truth for this session.
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set("menu_id", id);
    } else {
      params.delete("menu_id");
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  } catch {
    // URL persistence is best-effort; failed history writes must not block dashboard rendering.
  }
}

export function selectedContextData(data) {
  return data.selected_context && typeof data.selected_context === "object" ? data.selected_context : {};
}

export function contextsByMenu(data) {
  return data.contexts_by_menu && typeof data.contexts_by_menu === "object" && !Array.isArray(data.contexts_by_menu) ? data.contexts_by_menu : {};
}

export function contextDataForMenu(data, menuId) {
  const id = displayText(menuId, "");
  return contextsByMenu(data)[id] || (displayText(selectedContextData(data).menu_id, "") === id ? selectedContextData(data) : null);
}

export function availableContexts(data) {
  return asArray(data.available_contexts);
}

export function availableContextForMenu(data, menuId) {
  const id = displayText(menuId, "");
  return availableContexts(data).find((context) => displayText(context.menu_id, "") === id) || null;
}

export function isAvailableContextSelectable(context) {
  if (!context || typeof context !== "object") {
    return false;
  }
  if (context.selectable === true) {
    return true;
  }
  if (context.selectable === false) {
    return false;
  }
  return !["missing", "not_run"].includes(normalizeState(context.status));
}

export function isMenuSelectable(data, menuId) {
  return isAvailableContextSelectable(availableContextForMenu(data, menuId));
}

export function unavailableContextNotice(context, t) {
  const reasonKey = displayText(context?.disabled_reason_key, "context.menuAvailability.contextMissing");
  const reason = t(reasonKey, t("context.menuAvailability.contextMissing"));
  const detailKey = `context.menuAvailabilityDetail.${displayText(reasonKey, "").replace(/^context\.menuAvailability\./, "") || "contextMissing"}`;
  return {
    menuId: displayText(context?.menu_id, "unknown"),
    reason,
    detail: t(detailKey, displayText(context?.disabled_detail, reason)),
    nextAction: displayText(context?.required_next_action, ""),
  };
}

export function menuIdsForData(data) {
  const ids = [
    ...availableContexts(data).map((context) => displayText(context.menu_id, "")),
    ...Object.keys(contextsByMenu(data)),
    displayText(selectedContextData(data).menu_id, ""),
  ].filter(Boolean);
  return [...new Set(ids)];
}

export function producerMenuIdForData(data) {
  return displayText(selectedContextData(data).menu_id, menuIdsForData(data)[0] || "unknown");
}

export function resolveActiveMenuId(data, requestedMenuId = "") {
  const menuIds = menuIdsForData(data);
  const requested = displayText(requestedMenuId, "");
  const producerMenuId = producerMenuIdForData(data);
  if (
    requested &&
    menuIds.includes(requested) &&
    contextDataForMenu(data, requested) &&
    (isMenuSelectable(data, requested) || requested === producerMenuId)
  ) {
    return requested;
  }
  if (menuIds.includes(producerMenuId) && contextDataForMenu(data, producerMenuId)) {
    return producerMenuId;
  }
  return menuIds.find((menuId) => contextDataForMenu(data, menuId) && isMenuSelectable(data, menuId)) || producerMenuId;
}

function partialFailureStateForBlocker(status) {
  const state = normalizeState(status);
  if (state === "failed") {
    return "failed";
  }
  if (state === "blocked") {
    return "blocked";
  }
  return "unknown";
}

export function partialFailuresForActiveContext(data, activeContext, isProducerContext) {
  if (isProducerContext) {
    return asArray(data.partial_failures);
  }
  return asArray(activeContext.blockers).map((blocker) => ({
    source: displayText(blocker.source),
    status: partialFailureStateForBlocker(blocker.status),
    reason: displayText(blocker.reason),
    required_command: displayText(blocker.required_command),
  }));
}

export function resolveActiveDashboardData(data, activeMenuId) {
  const producerMenuId = producerMenuIdForData(data);
  const requestedMenuId = displayText(activeMenuId, "");
  const resolvedMenuId = resolveActiveMenuId(data, requestedMenuId || producerMenuId);
  const producerContext = selectedContextData(data);
  const activeContext = contextDataForMenu(data, resolvedMenuId) || producerContext;
  const activeContextMenuId = displayText(activeContext.menu_id, resolvedMenuId);
  const isProducerContext = activeContextMenuId === producerMenuId;
  const viewData =
    isProducerContext && activeContext === producerContext
      ? data
      : {
          ...data,
          selected_context: activeContext,
          partial_failures: partialFailuresForActiveContext(data, activeContext, isProducerContext),
        };
  return {
    data: viewData,
    activeMenuId: activeContextMenuId,
    activeContext,
    producerMenuId,
    isProducerContext,
    requestedMenuId,
  };
}
