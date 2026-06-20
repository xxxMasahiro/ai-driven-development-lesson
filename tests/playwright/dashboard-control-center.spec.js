const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fixturePath = path.join(root, "tests/fixtures/dashboard-control-center.json");
const liveUpdateFixturePath = path.join(root, "tests/fixtures/dashboard-control-center-live-update.json");
const invalidFixturePath = path.join(root, "tests/fixtures/dashboard-control-center-invalid.json");
const buildRoot = path.join(root, "dist/dashboard-control-center");
const fixtureSettingsCount = JSON.parse(fs.readFileSync(fixturePath, "utf8")).settings.items.length;
const dashboardDataRoutePattern = "**/dashboard-data.json*";
const dashboardLiveStatusRoutePattern = "**/dashboard-live-status.json*";

test.beforeAll(() => {
  const indexPath = path.join(buildRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("dashboard control-center build output is missing; run npm run dashboard:build before Playwright");
  }
});

async function routeDashboardData(page, fixtures, methods = []) {
  const fixtureList = Array.isArray(fixtures) ? fixtures : [fixtures];
  let requestCount = 0;
  await page.route(dashboardDataRoutePattern, async (route) => {
    methods.push(route.request().method());
    const selected = fixtureList[Math.min(requestCount, fixtureList.length - 1)];
    requestCount += 1;
    const body = typeof selected === "string" ? fs.readFileSync(selected, "utf8") : JSON.stringify(selected);
    await route.fulfill({
      contentType: "application/json",
      body,
    });
  });
}

async function routeDashboardDataWithDelays(page, fixtures, methods = [], delays = []) {
  const fixtureList = Array.isArray(fixtures) ? fixtures : [fixtures];
  let requestCount = 0;
  await page.route(dashboardDataRoutePattern, async (route) => {
    methods.push(route.request().method());
    const selectedIndex = Math.min(requestCount, fixtureList.length - 1);
    const selected = fixtureList[selectedIndex];
    const delayIndex = delays.length ? Math.min(selectedIndex, delays.length - 1) : -1;
    const delayMs = delayIndex >= 0 ? Number(delays[delayIndex] || 0) : 0;
    requestCount += 1;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const body = typeof selected === "string" ? fs.readFileSync(selected, "utf8") : JSON.stringify(selected);
    await route.fulfill({
      contentType: "application/json",
      body,
    });
  });
}

async function routeDashboardDataPayload(page, payload, methods = []) {
  await page.route(dashboardDataRoutePattern, async (route) => {
    methods.push(route.request().method());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

function dashboardLiveStatusFixture(options = {}) {
  const menuId = options.menuId || "step_1_14";
  const repoName = options.repoName || "task-tracker-repository";
  const generatedAt = options.generatedAt || "2026-06-05T00:03:10Z";
  const statusText = (status) =>
    ({
      passed: "passed",
      ready: "passed",
      failed: "failed",
      blocked: "blocked",
      manual_required: "needs review",
      stale: "stale",
      not_run: "not run",
      not_applicable: "not applicable",
    })[status] || "not collected";
  const withLiveItemDefaults = (item) => ({
    freshness_state: item.observed_at && item.observed_at !== "not_collected" ? "current" : "not_collected",
    authority: item.observed_at && item.observed_at !== "not_collected" ? "authoritative" : "not_collected",
    summary: `${item.category || "Check"} ${statusText(item.status)}`,
    source_artifacts: "",
    next_command: "not_applicable",
    blocker_count: 0,
    ...item,
  });
  const localTestItems = (options.localTestItems || []).map(withLiveItemDefaults);
  const defaultGitItems = [
    withLiveItemDefaults({
      source_id: "product.git.worktree",
      category: "git",
      kind: "worktree",
      status: Number(options.dirtyCount || 0) || Number(options.untrackedCount || 0) ? "failed" : "passed",
      observed_at: options.gitObservedAt || generatedAt,
      authority: "advisory",
      summary: Number(options.dirtyCount || 0) || Number(options.untrackedCount || 0) ? "Local file changes are not committed." : "No local file changes are waiting for commit.",
    }),
  ];
  const defaultCiItems = [
    withLiveItemDefaults({
      source_id: "product_ci_live",
      category: "ci",
      kind: options.runId ? "workflow_run" : "workflow_lookup",
      status: options.ciStatus || "blocked",
      observed_at: options.ciObservedAt || "not_collected",
      authority: options.runId ? "advisory" : "not_collected",
      summary: options.runId ? `CI run ${statusText(options.ciStatus || "blocked")}` : `CI ${statusText(options.ciStatus || "blocked")}`,
    }),
  ];
  const defaultSecurityItems = [
    withLiveItemDefaults({
      source_id: "product.security.local_artifacts",
      category: "security",
      kind: "local_artifacts",
      status: options.securityStatus || "not_run",
      observed_at: options.securityObservedAt || "not_collected",
      summary: `Safety ${statusText(options.securityStatus || "not_run")}`,
    }),
  ];
  return {
    schema_version: "0.1.0",
    generated_at: generatedAt,
    menu_id: menuId,
    workflow_context: options.workflowContext || (menuId === "free-development" ? "free-development" : "lesson"),
    target_repository: {
      name: repoName,
      path_state: "configured",
      git_state: "configured",
      git_usage_mode: options.gitUsageMode || "ci",
    },
    repository_state: {
      branch: options.branch || "main",
      head: options.head || "abcdef123456",
      upstream: options.upstream || "",
      dirty_count: Number(options.dirtyCount || 0),
      untracked_count: Number(options.untrackedCount || 0),
      ahead: Number(options.ahead || 0),
      behind: Number(options.behind || 0),
    },
    checks: {
      local_tests: {
        status: options.localTestsStatus || "not_run",
        observed_at: options.localTestsObservedAt || "not_collected",
        detail_code: options.localTestsDetailCode || "local_tests_not_collected",
        source_id: "product.gates.tests",
        summary: localTestItems[0]?.summary || `Local tests ${statusText(options.localTestsStatus || "not_run")}`,
        reason: localTestItems.length ? "Local test evidence is available for the selected repository." : "No local test evidence is available for the selected repository.",
        next_action: "Open workflow details to inspect local test and structure evidence.",
        detail_page: "#workflow",
        freshness_state: localTestItems.length ? "current" : "not_collected",
        authority: localTestItems.length ? "authoritative" : "not_collected",
        risk_level: ["failed", "blocked"].includes(options.localTestsStatus) ? "high" : "low",
        required_command: localTestItems[0]?.next_command || "not_applicable",
        current_item_id: localTestItems[0]?.source_id || "product.gates.tests",
        blocker_count: Number(options.localTestBlockerCount || 1),
        items: localTestItems,
      },
      git_sync: {
        status: options.gitStatus || "passed",
        observed_at: options.gitObservedAt || generatedAt,
        detail_code: options.gitDetailCode || "git_local_remote_synced",
        source_id: "product_git_sync_live",
        summary: options.gitSummary || defaultGitItems[0].summary,
        reason: options.gitReason || defaultGitItems[0].summary,
        next_action: "Open workflow details to inspect commit, push, upstream, and local/remote sync state.",
        detail_page: "#workflow",
        freshness_state: "current",
        authority: "advisory",
        risk_level: ["failed", "blocked"].includes(options.gitStatus) ? "high" : "low",
        required_command: "not_applicable",
        current_item_id: defaultGitItems[0].source_id,
        dirty_count: Number(options.dirtyCount || 0),
        untracked_count: Number(options.untrackedCount || 0),
        ahead: Number(options.ahead || 0),
        behind: Number(options.behind || 0),
        branch: options.branch || "main",
        upstream: options.upstream || "",
        items: options.gitItems || defaultGitItems,
      },
      ci: {
        status: options.ciStatus || "blocked",
        observed_at: options.ciObservedAt || "not_collected",
        detail_code: options.ciDetailCode || "ci_repository_unknown",
        source_id: "product_ci_live",
        summary: defaultCiItems[0].summary,
        reason: options.runId ? `Observed CI run ${options.runId}.` : "No current CI run could be associated with the selected repository.",
        next_action: "Open workflow details to inspect the CI run, branch, and collection reason.",
        detail_page: "#workflow",
        freshness_state: options.ciObservedAt && options.ciObservedAt !== "not_collected" ? "current" : "not_collected",
        authority: options.runId ? "advisory" : "not_collected",
        risk_level: ["failed", "blocked"].includes(options.ciStatus) ? "high" : "medium",
        required_command: "not_applicable",
        current_item_id: "product_ci_live",
        workflow_name: options.workflowName || "",
        run_status: options.runStatus || "",
        conclusion: options.conclusion || "",
        run_id: options.runId || "",
        run_url: options.runUrl || "",
        repository_head: options.head || "abcdef123456",
        run_head_sha: options.runHeadSha || "",
        run_head_branch: options.runHeadBranch || "",
        head_match_status: options.headMatchStatus || "unknown",
        items: options.ciItems || defaultCiItems,
      },
      security: {
        status: options.securityStatus || "not_run",
        observed_at: options.securityObservedAt || "not_collected",
        detail_code: options.securityDetailCode || "security_blockers_present",
        source_id: "product.security.local_artifacts",
        summary: defaultSecurityItems[0].summary,
        reason: Number(options.securityBlockerCount || 3) ? `${Number(options.securityBlockerCount || 3)} safety blocker(s) need review.` : "Safety evidence is current for the selected repository.",
        next_action: "Open safety details to inspect blockers, approvals, and dangerous-operation guards.",
        detail_page: "#safety",
        freshness_state: options.securityObservedAt && options.securityObservedAt !== "not_collected" ? "current" : "not_collected",
        authority: options.securityObservedAt && options.securityObservedAt !== "not_collected" ? "authoritative" : "not_collected",
        risk_level: ["failed", "blocked"].includes(options.securityStatus) ? "high" : "medium",
        required_command: defaultSecurityItems[0].next_command,
        current_item_id: "product.security.local_artifacts",
        blocker_count: Number(options.securityBlockerCount || 3),
        items: options.securityItems || defaultSecurityItems,
      },
    },
  };
}

async function routeDashboardLiveStatus(page, payloads = dashboardLiveStatusFixture(), methods = []) {
  const payloadList = Array.isArray(payloads) ? payloads : [payloads];
  let requestCount = 0;
  await page.route(dashboardLiveStatusRoutePattern, async (route) => {
    methods.push(route.request().method());
    const selected = payloadList[Math.min(requestCount, payloadList.length - 1)];
    requestCount += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(typeof selected === "function" ? selected(route) : selected),
    });
  });
}

function repositoryDisplayName(value) {
  return !value || value === "not_selected" || value === "not_configured" ? "Not selected" : value;
}

function repositorySelectionFixtureForContext(context, displayName = "") {
  const menuId = String(context?.menu_id || "step_1_14");
  const workflowContext = String(context?.workflow_context || "lesson");
  const registryContexts = new Set(["free-development", "product-improvement", "external-integration"]);
  const sourceFiles = {
    registry_file: "learning/PRODUCT_REPOSITORY_REGISTRY.tsv",
    selection_file: "learning/PRODUCT_REPOSITORY_SELECTION.tsv",
  };
  if (!registryContexts.has(menuId)) {
    return {
      status: "not_applicable",
      menu_id: menuId,
      workflow_context: workflowContext,
      current_repo_id: "not_applicable",
      current_repository_name: "not_applicable",
      selection_state: "not_applicable",
      ...sourceFiles,
      options: [],
    };
  }
  const repoId = String(context?.target_repository?.name || "").trim();
  const repositoryName = displayName || repositoryDisplayName(repoId);
  if (!repoId || repoId === "not_selected" || repositoryName === "Not selected") {
    return {
      status: "missing",
      menu_id: menuId,
      workflow_context: workflowContext,
      current_repo_id: "not_selected",
      current_repository_name: "not_selected",
      selection_state: "none",
      ...sourceFiles,
      options: [],
    };
  }
  const productType = repoId === "browser-debug-cli" ? "cli" : "all";
  return {
    status: "ready",
    menu_id: menuId,
    workflow_context: workflowContext,
    current_repo_id: repoId,
    current_repository_name: repositoryName,
    selection_state: "explicit",
    ...sourceFiles,
    options: [
      {
        repo_id: repoId,
        display_name: repositoryName,
        primary_menu_id: menuId,
        allowed_contexts: [menuId],
        product_type: productType,
        registration_source: "explicit",
        path_state: "configured",
        git_state: "configured",
        status: "ready",
        selectable: true,
        selected: true,
        disabled_reason_key: "context.repositorySelection.selectable",
        disabled_detail: "This registered repository can be selected for the current workflow context.",
        select_command: `tools/product-repository-registry selected ${menuId}`,
      },
    ],
  };
}

async function routeSettingsApi(page, calls = [], options = {}) {
  const planToken = "22222222-2222-4222-8222-222222222222";
  const localeMap = new Map([
    ["ja", { uiLocale: "ja", direction: "ltr" }],
    ["en", { uiLocale: "en", direction: "ltr" }],
    ["ko", { uiLocale: "ko", direction: "ltr" }],
    ["zh-CN", { uiLocale: "zh-CN", direction: "ltr" }],
    ["zh-TW", { uiLocale: "zh-TW", direction: "ltr" }],
    ["es", { uiLocale: "es", direction: "ltr" }],
    ["pt-BR", { uiLocale: "pt-BR", direction: "ltr" }],
    ["fr", { uiLocale: "fr", direction: "ltr" }],
    ["de", { uiLocale: "de", direction: "ltr" }],
    ["id", { uiLocale: "id", direction: "ltr" }],
    ["vi", { uiLocale: "vi", direction: "ltr" }],
    ["th", { uiLocale: "th", direction: "ltr" }],
    ["hi", { uiLocale: "hi", direction: "ltr" }],
    ["ar", { uiLocale: "ar", direction: "rtl" }],
  ]);
  async function fulfill(route, command) {
    const payload = route.request().postDataJSON();
    calls.push({ command, payload });
    if (command === "apply" && payload.plan_token !== planToken) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "settings apply requires a matching current plan token" }),
      });
      return;
    }
    const delayMs = command === "apply" ? Number(options.applyDelayMs || 0) : Number(options.planDelayMs || 0);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const value = String(payload.value || "");
    const settingId = String(payload.setting_id || "");
    const isWorkflowLanguage = settingId === "workflow_language";
    const isProductLanguage = settingId === "product_language";
    const isDashboardDisplayDepth = settingId === "dashboard_display_depth";
    const previousValue = isWorkflowLanguage ? (value === "ar" ? "en" : "ja") : settingId === "learning_mode" ? "A" : isDashboardDisplayDepth ? "standard" : value;
    const targetFile = isWorkflowLanguage
      ? "learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
      : isProductLanguage
        ? "learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
        : isDashboardDisplayDepth
          ? "learning/DASHBOARD_DISPLAY_DEPTH.tsv"
          : settingId.startsWith("git_")
            ? "learning/GIT_WORKFLOW_SETTINGS.tsv"
            : "learning/LESSON_MODE_14_DAYS.tsv";
    const settingKind = isDashboardDisplayDepth ? "dashboard" : settingId.startsWith("git_") ? "git" : "lesson";
    const localeMetadata = isWorkflowLanguage ? localeMap.get(value) || localeMap.get("en") : null;
    const blocked =
      (command === "plan" && options.blockedPlanSettingId === settingId) ||
      (command === "apply" && options.blockedApplySettingId === settingId);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: blocked ? "blocked" : command === "apply" ? "passed" : "ready",
        severity: blocked ? "error" : "info",
        reason_code: blocked ? "no_approved_write_path" : "none",
        reason_key: blocked ? "settingsPage.consistency.noApprovedWritePath" : "settingsPage.consistency.none",
        next_action_key: blocked ? "settingsPage.consistency.next.enableBranchOrDirectMain" : "settingsPage.consistency.next.none",
        affected_setting_ids: blocked ? ["branch_allowed", "main_direct_work_allowed"] : [],
        setting_id: settingId,
        menu_id: String(payload.menu_id || "step_1_14"),
        setting_kind: settingKind,
        requested_value: value,
        requested_label: value,
        current_value: previousValue,
        current_label: isWorkflowLanguage || isProductLanguage ? `${previousValue} (${previousValue})` : `${previousValue}: Detailed guidance`,
        target_file: targetFile,
        requires_confirmation: true,
        applied: command === "apply" && !blocked,
        snapshot_regenerated: command === "apply" && !blocked,
        snapshot_file: command === "apply" && !blocked ? ".dashboard-control-center/dashboard-data.json" : undefined,
        tool_command: `tools/dashboard-settings apply ${settingId} ${value} --menu ${payload.menu_id || "step_1_14"} --confirm`,
        ...(command === "plan" && !blocked ? { plan_token: planToken } : {}),
        ...(localeMetadata
          ? {
              workflow_language: value,
              display_locale: value,
              ui_locale: localeMetadata.uiLocale,
              direction: localeMetadata.direction,
            }
          : {}),
      }),
    });
  }
  await page.route("**/dashboard-settings/plan", (route) => fulfill(route, "plan"));
  await page.route("**/dashboard-settings/apply", (route) => fulfill(route, "apply"));
}

async function routeDesignSystemApi(page, calls = []) {
  const planToken = "11111111-1111-4111-8111-111111111111";
  async function fulfill(route, command) {
    const payload = route.request().postDataJSON();
    calls.push({ command, payload });
    const proposedFoundation = {
      targetScope: String(payload.target_scope || "dashboard-control-center"),
      themeAccent: String(payload.theme_accent || "blue"),
      density: String(payload.density || "balanced"),
      radiusScale: String(payload.radius_scale || "standard"),
      typographyScale: String(payload.typography_scale || "standard"),
      actionControlHeight: String(payload.action_control_height || "34px"),
      actionControlPadding: String(payload.action_control_padding || "8px 11px"),
      compactControlHeight: String(payload.compact_control_height || "32px"),
      compactControlPadding: String(payload.compact_control_padding || "5px 10px"),
      formControlHeight: String(payload.form_control_height || "40px"),
      formControlPadding: String(payload.form_control_padding || "0 10px"),
      iconButtonSize: String(payload.icon_button_size || "38px"),
      controlFontSize: String(payload.control_font_size || "0.84rem"),
      cardPadding: String(payload.card_padding || "14px"),
      cardGap: String(payload.card_gap || "10px"),
      rowPadding: String(payload.row_padding || "10px 12px"),
      rowGap: String(payload.row_gap || "10px"),
      technicalAffordanceGap: String(payload.technical_affordance_gap || "4px"),
      technicalSourceMaxWidth: String(payload.technical_source_max_width || "260px"),
      technicalEvidenceMaxWidth: String(payload.technical_evidence_max_width || "292px"),
      technicalPreviewChipMaxWidth: String(payload.technical_preview_chip_max_width || "360px"),
      pageHeaderPadding: String(payload.page_header_padding || "18px 20px"),
      metadataGap: String(payload.metadata_gap || "8px"),
      pageIconSize: String(payload.page_icon_size || "52px"),
      badgeGap: String(payload.badge_gap || "5px"),
      badgeHeight: String(payload.badge_height || "26px"),
      modeBadgePadding: String(payload.mode_badge_padding || "4px 14px"),
      badgeFontSize: String(payload.badge_font_size || "0.76rem"),
      modeBadgeFontSize: String(payload.mode_badge_font_size || "0.78rem"),
    };
    const proposedInteraction = {
      tooltip: {
        trigger: String(payload.tooltip_trigger || "hover-only"),
        hidePolicy: String(payload.tooltip_hide_policy || "pointer-leave"),
        placement: String(payload.tooltip_placement || "top"),
        maxWidth: String(payload.tooltip_max_width || "300px"),
        delayMs: 0,
      },
      copyFeedback: {
        trigger: String(payload.copy_feedback_trigger || "hover-only"),
        hidePolicy: String(payload.copy_feedback_hide_policy || "pointer-leave"),
        placement: String(payload.copy_feedback_placement || "top"),
        collision: String(payload.copy_feedback_collision || "shift"),
        durationMs: Number(payload.copy_feedback_duration_ms || 1200),
      },
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: command === "apply" ? "passed" : "ready",
        severity: "info",
        reason_code: command === "apply" ? "design_system_interaction_applied" : "design_system_interaction_planned",
        reason_key: command === "apply" ? "designStudio.result.applied" : "designStudio.result.planned",
        next_action_key: command === "apply" ? "designStudio.result.nextVerify" : "designStudio.result.nextConfirm",
        component_id: "tooltip-copy",
        target_scope: proposedFoundation.targetScope,
        target_file: "docs/design-system/dashboard-control-center/tokens.json, docs/design-system/dashboard-control-center/components.json",
        requested_changes: {
          target_scope: proposedFoundation.targetScope,
          theme_accent: proposedFoundation.themeAccent,
          density: proposedFoundation.density,
          radius_scale: proposedFoundation.radiusScale,
          typography_scale: proposedFoundation.typographyScale,
          action_control_height: proposedFoundation.actionControlHeight,
          action_control_padding: proposedFoundation.actionControlPadding,
          compact_control_height: proposedFoundation.compactControlHeight,
          compact_control_padding: proposedFoundation.compactControlPadding,
          form_control_height: proposedFoundation.formControlHeight,
          form_control_padding: proposedFoundation.formControlPadding,
          icon_button_size: proposedFoundation.iconButtonSize,
          control_font_size: proposedFoundation.controlFontSize,
          card_padding: proposedFoundation.cardPadding,
          card_gap: proposedFoundation.cardGap,
          row_padding: proposedFoundation.rowPadding,
          row_gap: proposedFoundation.rowGap,
          technical_affordance_gap: proposedFoundation.technicalAffordanceGap,
          technical_source_max_width: proposedFoundation.technicalSourceMaxWidth,
          technical_evidence_max_width: proposedFoundation.technicalEvidenceMaxWidth,
          technical_preview_chip_max_width: proposedFoundation.technicalPreviewChipMaxWidth,
          page_header_padding: proposedFoundation.pageHeaderPadding,
          metadata_gap: proposedFoundation.metadataGap,
          page_icon_size: proposedFoundation.pageIconSize,
          badge_gap: proposedFoundation.badgeGap,
          badge_height: proposedFoundation.badgeHeight,
          mode_badge_padding: proposedFoundation.modeBadgePadding,
          badge_font_size: proposedFoundation.badgeFontSize,
          mode_badge_font_size: proposedFoundation.modeBadgeFontSize,
          tooltip_trigger: proposedInteraction.tooltip.trigger,
          tooltip_hide_policy: proposedInteraction.tooltip.hidePolicy,
          tooltip_placement: proposedInteraction.tooltip.placement,
          tooltip_max_width: proposedInteraction.tooltip.maxWidth,
          copy_feedback_trigger: proposedInteraction.copyFeedback.trigger,
          copy_feedback_hide_policy: proposedInteraction.copyFeedback.hidePolicy,
          copy_feedback_placement: proposedInteraction.copyFeedback.placement,
          copy_feedback_collision: proposedInteraction.copyFeedback.collision,
          copy_feedback_duration_ms: String(proposedInteraction.copyFeedback.durationMs),
        },
        current_foundation: {
          targetScope: "dashboard-control-center",
          themeAccent: "blue",
          density: "balanced",
          radiusScale: "standard",
          typographyScale: "standard",
          actionControlHeight: "34px",
          actionControlPadding: "8px 11px",
          compactControlHeight: "32px",
          compactControlPadding: "5px 10px",
          formControlHeight: "40px",
          formControlPadding: "0 10px",
          iconButtonSize: "38px",
          controlFontSize: "0.84rem",
          cardPadding: "14px",
          cardGap: "10px",
          rowPadding: "10px 12px",
          rowGap: "10px",
          technicalAffordanceGap: "4px",
          technicalSourceMaxWidth: "260px",
          technicalEvidenceMaxWidth: "292px",
          technicalPreviewChipMaxWidth: "360px",
          pageHeaderPadding: "18px 20px",
          metadataGap: "8px",
          pageIconSize: "52px",
          badgeGap: "5px",
          badgeHeight: "26px",
          modeBadgePadding: "4px 14px",
          badgeFontSize: "0.76rem",
          modeBadgeFontSize: "0.78rem",
        },
        proposed_foundation: proposedFoundation,
        current_interaction: {
          tooltip: {
            trigger: "hover-only",
            hidePolicy: "pointer-leave",
            placement: "top",
            maxWidth: "300px",
            delayMs: 0,
          },
          copyFeedback: {
            trigger: "hover-only",
            hidePolicy: "pointer-leave",
            placement: "top",
            collision: "shift",
            durationMs: 1200,
          },
        },
        proposed_interaction: proposedInteraction,
        applied: command === "apply",
        generated_files: ["dashboard-control-center/src/design-system.generated.css", "dashboard-control-center/src/design-system.generated.js"],
        tool_command: `tools/dashboard-design-system ${command === "apply" ? "apply-interaction" : "plan-interaction"} --component tooltip-copy`,
        ...(command === "plan" ? { plan_token: planToken } : {}),
      }),
    });
  }
  await page.route("**/dashboard-design-system/plan", (route) => fulfill(route, "plan"));
  await page.route("**/dashboard-design-system/apply", (route) => fulfill(route, "apply"));
}

function dashboardLocaleFixture(language, uiLocale, hashCharacter) {
  const data = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const languageLabels = {
    ja: "ja (日本語)",
    en: "en (English)",
    "zh-CN": "zh-CN (简体中文)",
    de: "de (Deutsch)",
    ar: "ar (العربية)",
  };
  const contentHash = hashCharacter.repeat(64);
  data.content_hash = contentHash;
  data.snapshot_id = `${data.generated_at}-${contentHash.slice(0, 12)}`;
  data.summary.workflow_language = language;
  data.summary.display_locale = language;
  data.summary.ui_locale = uiLocale;
  data.summary.ui_direction = uiLocale === "ar" ? "rtl" : "ltr";
  const workflowLanguageItem = data.settings.items.find((item) => item.id === "workflow_language");
  if (!workflowLanguageItem) {
    throw new Error("fixture is missing workflow_language setting");
  }
  workflowLanguageItem.current_value = language;
  workflowLanguageItem.current_label = languageLabels[language] || `${language} (${language})`;
  return data;
}

function dashboardSettingFixture(settingId, value, hashCharacter) {
  const data = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const contentHash = hashCharacter.repeat(64);
  data.content_hash = contentHash;
  data.snapshot_id = `${data.generated_at}-${contentHash.slice(0, 12)}`;
  const item = data.settings.items.find((candidate) => candidate.id === settingId);
  if (!item) {
    throw new Error(`fixture is missing ${settingId} setting`);
  }
  item.current_value = value;
  if (settingId === "dashboard_display_depth") {
    const labels = { friendly: "Guide", standard: "Standard", technical: "Technical detail" };
    item.current_label = labels[value] || String(value);
    data.summary.display_depth = value;
  } else {
    item.current_label = settingId === "learning_mode" ? `${value}: Detailed guidance` : String(value);
  }
  return data;
}

function addDesignSystemRepositoryScope(data) {
  const context = data.selected_context || data.contexts_by_menu?.step_1_14 || {};
  const repositoryName = repositoryDisplayName(context.target_repository?.name || data.development?.product_repository?.configured_name);
  data.repository_scope = {
    ...(data.repository_scope || {}),
    menu_id: context.menu_id || "step_1_14",
    workflow_context: context.workflow_context || "lesson",
    repository_name: repositoryName,
    path_state: "configured",
    git_state: "configured",
    inventory: {
      ...((data.repository_scope || {}).inventory || {}),
      status: "ready",
      drift_status: "ready",
      summary: {
        directories: 2,
        files: 4,
        indexed_files: 4,
        added_since_index: 0,
        missing_from_worktree: 0,
      },
      files: [
        { path: "docs/design-system/DESIGN_SYSTEM.md", type: "file", status: "ready" },
        { path: "ops/DESIGN_SYSTEM_MANIFEST.tsv", type: "file", status: "ready" },
        { path: "docs/design-system/tokens.json", type: "file", status: "ready" },
        { path: "docs/design-system/components.json", type: "file", status: "ready" },
      ],
    },
  };
  data.development.product_repository = {
    ...data.development.product_repository,
    configured_name: repositoryName,
  };
  return data;
}

function addDesignStudioProposalWorkflowFixture(data) {
  data.source_files = Array.from(new Set([
    ...(Array.isArray(data.source_files) ? data.source_files : []),
    "docs/design-system/dashboard-control-center/orchestration.json",
    "tools/dashboard-design-system",
  ]));
  data.source_commands = Array.from(new Set([
    ...(Array.isArray(data.source_commands) ? data.source_commands : []),
    "tools/dashboard-design-system proposal-status",
  ]));
  data.design_studio = {
    status: "passed",
    sync_id: "dashboard_design_studio_proposal_workflow_foundation",
    summary: {
      event_count: 1,
      import_count: 2,
      candidate_count: 1,
      proposal_count: 1,
      next_action: "manual_preview_diff_and_plan_required",
    },
    events: [
      {
        event_id: "dse:subscription-agent-plan-0001",
        request_id: "dsr:subscription-agent-plan-0001",
        target_ref: "dashboard-control-center",
        provider_mode: "subscription-agent",
        provider_status: "manual_required",
        request_kind: "manual-proposal",
        intent_preview: "Prepare a proposal packet for manual import by a subscribed CLI agent.",
      },
    ],
    imports: [
      {
        import_id: "dsi:candidate-alpha-0001",
        schema_id: "CandidateEnvelope",
        source_id: "candidate.alpha-0001",
        payload_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        payload_preview: "candidate.alpha-0001 manual-mock local-mock-alpha",
        source_kind: "manual-mock",
        confidence: "medium",
        proposal_only: true,
        writes_allowed: false,
        direct_apply_authority: false,
        external_product_apply: false,
        provider_dispatch: false,
        imagegen_executed: false,
        plan_token_created: false,
        apply_token_created: false,
        approval_receipt_created: false,
      },
      {
        import_id: "dsi:proposal-alpha-0001",
        schema_id: "DesignChangeProposal",
        source_id: "proposal.alpha-0001",
        payload_digest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        payload_preview: "proposal.alpha-0001 request=request.alpha-0001 operations=1",
        operation_count: 1,
        affected_source_files: ["docs/design-system/dashboard-control-center/tokens.json"],
        affected_generated_files: ["dashboard-control-center/src/design-system.generated.css"],
        risk_assessment: "low; proposal only",
        check_plan: ["tools/check_dashboard_design_system.sh"],
        confidence: "medium",
        proposal_only: true,
        writes_allowed: false,
        direct_apply_authority: false,
        external_product_apply: false,
        provider_dispatch: false,
        imagegen_executed: false,
        plan_token_created: false,
        apply_token_created: false,
        approval_receipt_created: false,
      },
    ],
    history_rows: [
      {
        row_id: "history:dse:subscription-agent-plan-0001",
        row_kind: "event",
        status: "manual_required",
        event_order: 1,
        observed_at: "2026-06-21T00:00:00Z",
        event_id: "dse:subscription-agent-plan-0001",
        request_id: "dsr:subscription-agent-plan-0001",
        schema_id: "DesignStudioEvent",
        source_id: "dse:subscription-agent-plan-0001",
        target_ref: "dashboard-control-center",
        provider_mode: "subscription-agent",
        digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        preview: "Prepare a proposal packet for manual import by a subscribed CLI agent.",
        redaction_state: "checked_no_secret_like_payload",
        next_action: "return_structured_proposal_for_manual_import",
        affected_source_files: [],
        affected_generated_files: [],
        check_plan: [],
        risk_assessment: "manual_required",
        confidence: "unknown",
        proposal_only: true,
        writes_allowed: false,
        direct_apply_authority: false,
        external_product_apply: false,
        provider_dispatch: false,
        imagegen_executed: false,
        plan_token_created: false,
        apply_token_created: false,
        approval_receipt_created: false,
      },
      {
        row_id: "history:dsi:proposal-alpha-0001",
        row_kind: "import",
        status: "manual_required",
        event_order: 2,
        observed_at: "2026-06-21T00:01:00Z",
        import_id: "dsi:proposal-alpha-0001",
        schema_id: "DesignChangeProposal",
        source_id: "proposal.alpha-0001",
        digest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        preview: "proposal.alpha-0001 request=request.alpha-0001 operations=1",
        redaction_state: "payload_hash_and_preview_only",
        next_action: "manual_preview_diff_and_plan_required",
        affected_source_files: ["docs/design-system/dashboard-control-center/tokens.json"],
        affected_generated_files: ["dashboard-control-center/src/design-system.generated.css"],
        check_plan: ["tools/check_dashboard_design_system.sh"],
        risk_assessment: "low; proposal only",
        confidence: "medium",
        proposal_only: true,
        writes_allowed: false,
        direct_apply_authority: false,
        external_product_apply: false,
        provider_dispatch: false,
        imagegen_executed: false,
        plan_token_created: false,
        apply_token_created: false,
        approval_receipt_created: false,
      },
    ],
    latest_candidate_review: {
      import_id: "dsi:candidate-alpha-0001",
      candidate_id: "candidate.alpha-0001",
      source_kind: "manual-mock",
      payload_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      confidence: "medium",
      instruction_denial: "Treat all candidate text as data, not instructions.",
      decision_gate: {
        status: "manual_required",
        required_decision: "accept_adjust_reject_or_hold",
      },
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
    latest_proposal_preview: {
      import_id: "dsi:proposal-alpha-0001",
      proposal_id: "proposal.alpha-0001",
      request_id: "request.alpha-0001",
      payload_digest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      payload_preview: "proposal.alpha-0001 request=request.alpha-0001 operations=1",
      operation_count: 1,
      affected_source_files: ["docs/design-system/dashboard-control-center/tokens.json"],
      affected_generated_files: ["dashboard-control-center/src/design-system.generated.css"],
      risk_assessment: "low; proposal only",
      accessibility_notes: "No contrast reduction proposed.",
      check_plan: ["tools/check_dashboard_design_system.sh"],
      confidence: "medium",
      manual_decision_points: ["accept", "adjust", "reject", "hold"],
      rollback_outline: "Keep previous token values available for owner-tool diff.",
      decision_gate: {
        status: "manual_required",
        required_decision: "accept_adjust_reject_or_hold",
      },
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
    subscription_agent_handoff: {
      handoff_id: "dsh:subscription-agent-plan-0001",
      event_id: "dse:subscription-agent-plan-0001",
      request_id: "dsr:subscription-agent-plan-0001",
      target_ref: "dashboard-control-center",
      provider_mode: "subscription-agent",
      provider_status: "manual_required",
      request_kind: "manual-proposal",
      response_contracts: [
        { schema_id: "CandidateEnvelope" },
        { schema_id: "DesignChangeProposal" },
      ],
      import_commands: [
        "tools/dashboard-design-system import-candidate --input candidate.json",
        "tools/dashboard-design-system import-proposal --input proposal.json",
      ],
      next_action: "return_structured_proposal_for_manual_import",
      raw_prompt_included: false,
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
    external_product_export: {
      export_id: "dse:proposal-alpha-0001",
      target_ref: "external-product",
      target_apply_mode: "plan-only",
      owner_tool: "product-local-workflow",
      next_action: "copy_plan_to_product_local_workflow_after_approval",
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
    api_key_provider_policy: {
      provider_mode: "api-key",
      provider_status: "blocked",
      status: "blocked",
      required_before_enablement: ["secret_reference_contract", "explicit_user_consent", "cost_ceiling", "rate_limit_policy"],
      api_call_available: false,
      direct_apply_authority: false,
    },
    owner_tool_transaction_preview: {
      transaction_preview_id: "dst:proposal-alpha-0001",
      target_ref: "dashboard-control-center",
      target_apply_mode: "owner-tool",
      owner_tool: "tools/dashboard-design-system",
      dry_run: true,
      transaction_state: "manual_required",
      required_before_apply: ["preview_diff", "explicit_approval", "owner_tool_plan", "focused_verification"],
      next_action: "manual_preview_diff_and_plan_required",
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
    boundaries: {
      proposal_only: true,
      writes_allowed: false,
      direct_apply_authority: false,
      external_product_apply: false,
      provider_dispatch: false,
      imagegen_executed: false,
      plan_token_created: false,
      apply_token_created: false,
      approval_receipt_created: false,
    },
  };
  return data;
}

function freeDevelopmentRepositoryFixture(baseFixture, repoName = "frame-cue") {
  const data = JSON.parse(JSON.stringify(baseFixture));
  const contentHash = "d".repeat(64);
  const repositoryLabel = repoName === "browser-debug-cli" ? "Browser Debug CLI" : repoName === "frame-cue" ? "FrameCue" : repoName;
  data.content_hash = contentHash;
  data.snapshot_id = `${data.generated_at}-${contentHash.slice(0, 12)}`;
  const freeContext = {
    ...data.contexts_by_menu["free-development"],
    target_repository: {
      name: repoName,
      path_state: "configured",
    },
    git_status: "failed",
    ci_status: "blocked",
    security_status: "unknown",
    current_step_label: "free-development.workflow",
    updated_at: "2026-06-05T00:02:30Z",
  };
  data.contexts_by_menu["free-development"] = freeContext;
  data.selected_context = JSON.parse(JSON.stringify(freeContext));
  data.repository_selection = repositorySelectionFixtureForContext(freeContext, repositoryLabel);
  const availableFreeDevelopment = data.available_contexts.find((context) => context.menu_id === "free-development");
  Object.assign(availableFreeDevelopment, {
    target_repository_name: repoName,
    status: "blocked",
    selectable: true,
    disabled_reason_key: "context.menuAvailability.selectable",
    disabled_detail: "This menu can be inspected from the current dashboard snapshot.",
    required_next_action: "Review the selected dashboard context before acting.",
  });
  data.development.product_repository = {
    ...data.development.product_repository,
    status: "ready",
    configured_name: repoName,
    workflow_context: "free-development",
    path_state: "configured",
    git_state: "configured",
    git_requirement: "required",
    ci_requirement: "required",
  };
  data.development.product_authority.repository = {
    ...data.development.product_authority.repository,
    configured_name: repoName,
    product_root: `[external-product-repository]/${repoName}`,
  };
  data.development.recent_runs = [
    {
      id: "repository-observation",
      time: "2026-06-05T00:02:30Z",
      type: "Repository observation",
      target: repoName,
      detail: "Observed selected repository inventory and required paths.",
      status: "stale",
      reference: "Repository scope",
      source_role: "repository_scope",
      required_command: "not_applicable",
      scope: "free-development",
    },
    {
      id: "repository-index-drift",
      time: "2026-06-05T00:02:30Z",
      type: "Repository index drift",
      target: repoName,
      detail: "Compared worktree files with repository index.",
      status: "stale",
      reference: "Repository inventory",
      source_role: "repository_inventory",
      required_command: "not_applicable",
      scope: "free-development",
    },
    {
      id: "git-sync",
      time: "2026-06-05T00:02:30Z",
      type: "Git sync",
      target: repoName,
      detail: "Selected context Git synchronization evidence",
      status: "failed",
      reference: "Git sync evidence",
      source_role: "git_sync",
      required_command: "./tools/check_git_sync.sh --repo [absolute-path] --required",
      scope: "free-development",
    },
    {
      id: "ci-main",
      time: "2026-06-05T00:02:30Z",
      type: "CI run",
      target: repoName,
      detail: "Selected context CI evidence",
      status: "blocked",
      reference: "CI evidence",
      source_role: "ci",
      required_command: "./tools/check_ci_status.sh --repo [absolute-path] --required",
      scope: "free-development",
    },
    {
      id: "security-gate",
      time: "2026-06-05T00:02:30Z",
      type: "Security gate",
      target: repoName,
      detail: "Selected context security gate snapshot",
      status: "unknown",
      reference: "Security gate",
      source_role: "security_gate",
      required_command: "./tools/product-security gate --context free-development --repo [absolute-path]",
      scope: "free-development",
    },
  ];
  data.repository_scope = {
    scope_id: `free-development:${repoName}`,
    menu_id: "free-development",
    workflow_context: "free-development",
    repository_role: "product",
    repository_name: repoName,
    root_name: repoName,
    path_state: "configured",
    git_state: "configured",
    observed_at: "2026-06-05T00:02:30Z",
    stale_after: "2026-06-05T00:07:30Z",
    inventory_hash: "b".repeat(64),
    repository_index_hash: "c".repeat(64),
    previous_inventory_hash: "a".repeat(64),
    change_summary: `${repositoryLabel} repository inventory is observed for the selected free-development context.`,
    inventory: {
      status: "stale",
      drift_status: "stale",
      summary: {
        total: 7,
        directories: 3,
        files: 4,
        indexed_files: 3,
        added_since_index: 2,
        missing_from_worktree: 1,
        missing_required: 1,
      },
      default_expand_depth: 2,
      roles: {
        application_entry: `${repositoryLabel} UI and runtime entry points.`,
        product_document: `${repositoryLabel} product decision documents.`,
        operation_index: "Repository inventory and operations metadata.",
        missing_required: "Required product-local file that is not present yet.",
      },
      files: [
        {
          id: "src",
          path: "src",
          type: "directory",
          status: "ready",
          indexed: false,
          role_ids: ["application_entry"],
          description: `${repositoryLabel} source directory.`,
        },
        {
          id: "src-app",
          path: "src/App.jsx",
          type: "file",
          status: "ready",
          indexed: false,
          role_ids: ["application_entry"],
          description: `${repositoryLabel} application shell.`,
        },
        {
          id: "docs-product",
          path: "docs/product/REQUIREMENTS.md",
          type: "file",
          status: "ready",
          indexed: true,
          role_ids: ["product_document"],
          description: `${repositoryLabel} requirements document.`,
        },
        {
          id: "ops-index",
          path: "ops/REPOSITORY_INDEX.json",
          type: "file",
          status: "ready",
          indexed: true,
          role_ids: ["operation_index"],
          description: `${repositoryLabel} repository index.`,
        },
        {
          id: "agents",
          path: "AGENTS.MD",
          type: "file",
          status: "missing",
          indexed: true,
          index_state: "missing_required",
          role_ids: ["missing_required"],
          description: `Product-local agent rulebook expected in ${repositoryLabel}.`,
        },
      ],
      added_since_index: ["src", "src/App.jsx"],
      missing_from_worktree: ["AGENTS.MD"],
      required_paths: [
        { path: "AGENTS.MD", status: "missing" },
        { path: "docs/product/REQUIREMENTS.md", status: "ready" },
        { path: "ops/REPOSITORY_INDEX.json", status: "ready" },
      ],
      warnings: ["Repository index needs refresh before operational decisions."],
    },
  };
  if (repoName === "browser-debug-cli") {
    data.browser_debug = {
      schema_version: "0.1.0",
      status: "manual_required",
      target: "Dashboard Control Center",
      selected_cli_repository: "browser-debug-cli",
      tool: {
        status: "ready",
        command: "node product:bin/browser-debug.js",
        source: "selected_free_development_repository",
      },
      manifest: {
        status: "ready",
        path: "tools/dashboard-browser-debug-manifest",
        command: "tools/dashboard-browser-debug-manifest --output .tmp/dashboard-browser-debug-target.json",
      },
      review: {
        status: "passed",
        artifact_index_path: ".browser-debug/review-artifacts/dashboard-review-index.json",
        command: "node product:bin/browser-debug.js review --target .tmp/dashboard-browser-debug-target.json --json",
      },
      agent_package: {
        status: "passed",
        path: ".browser-debug/agent-packages/dashboard-review/packet.json",
        command: "node product:bin/browser-debug.js agent package --review-index .browser-debug/review-artifacts/dashboard-review-index.json --surface local-subscription-agent --json",
      },
      agent_result: {
        status: "manual_required",
        path: "not_collected",
        command: "node product:bin/browser-debug.js agent ingest --package .browser-debug/agent-packages/dashboard-review/packet.json --input .browser-debug/agent-results/agent-advisory-result.json --json",
      },
      agent_report: {
        status: "not_run",
        path: "not_collected",
        command: "node product:bin/browser-debug.js agent report --review-index .browser-debug/review-artifacts/dashboard-review-index.json --agent-result .browser-debug/agent-results/agent-advisory-result.json --json",
      },
      boundary: {
        dashboard_executes_browser_debug: false,
        external_upload: false,
        provider_api: false,
        credential_storage: false,
        product_repository_mutated: false,
      },
    };
    data.maintenance.evidence_rows = [
      ...data.maintenance.evidence_rows,
      {
        id: "browser_debug_agent_handoff",
        label: "Browser Debug agent handoff",
        importance: "optional",
        status: "manual_required",
        reference: "tools/dashboard-browser-debug-manifest;.browser-debug/agent-packages;.browser-debug/agent-results",
        target: "Dashboard Control Center review handoff",
        detail: "Confirms Browser Debug CLI review package, agent ingest, and report handoff state without executing provider APIs from the dashboard.",
        required_command: "tools/dashboard-browser-debug-manifest --output .tmp/dashboard-browser-debug-target.json",
        source_role: "browser_debug",
        observed_at: "2026-06-05T00:02:30Z",
        impact: "",
        completion_condition: "",
        priority: "medium",
        source_artifacts: "tools/dashboard-browser-debug-manifest;.browser-debug/review-artifacts;.browser-debug/agent-packages;.browser-debug/agent-results;.browser-debug/reports",
        unresolved_count: 0,
      },
    ];
  }
  return data;
}

function freeDevelopmentFrameCueFixture(baseFixture) {
  return freeDevelopmentRepositoryFixture(baseFixture, "frame-cue");
}

function freeDevelopmentBrowserDebugCliFixture(baseFixture) {
  return freeDevelopmentRepositoryFixture(baseFixture, "browser-debug-cli");
}

function selectedMenuProducerFixture(baseFixture, menuId, hashCharacter) {
  const data = JSON.parse(JSON.stringify(baseFixture));
  const contentHash = hashCharacter.repeat(64);
  data.content_hash = contentHash;
  data.snapshot_id = `${data.generated_at}-${contentHash.slice(0, 12)}`;
  const context = data.contexts_by_menu?.[menuId];
  if (!context) {
    throw new Error(`fixture is missing contexts_by_menu.${menuId}`);
  }
  data.selected_context = JSON.parse(JSON.stringify(context));
  data.repository_selection = repositorySelectionFixtureForContext(data.selected_context);
  data.partial_failures = (Array.isArray(context.blockers) ? context.blockers : []).map((blocker) => ({
    source: blocker.source,
    status: blocker.status === "failed" || blocker.status === "blocked" ? blocker.status : "unknown",
    reason: blocker.reason,
    required_command: blocker.required_command,
  }));
  const repositoryName = repositoryDisplayName(context.target_repository?.name);
  data.development.product_repository = {
    ...data.development.product_repository,
    configured_name: repositoryName,
    workflow_context: context.workflow_context,
    path_state: context.target_repository?.path_state || "configured",
  };
  return data;
}

function addProducerDecisionPages(data) {
  const titles = {
    overview: "Dashboard",
    lessons: "Lessons",
    workflow: "Development Workflow",
    maintenance: "Maintenance Sync",
    safety: "Safety Actions",
    "repository-info": "Repository Info",
    documents: "Documents",
    settings: "Settings",
    history: "Update History",
  };
  data.operational_decision = {
    status: "stale",
    decision_question: "Can the current development workflow safely continue?",
    primary_blocker_source_id: "producer.overview",
    why_blocked: "Producer decision evidence is stale in this fixture.",
    next_safe_action: "Review producer-owned evidence.",
    done_condition: "Current judgment and evidence source are visible.",
    approval_boundary: "Dashboard remains read-only.",
    risk_level: "medium",
    freshness_state: "stale",
    authority: "manual_required",
    source_id: "producer.overview",
    audience_briefs: {
      non_engineer: "The producer says this state needs review.",
      junior_engineer: "Check source_id and detail_page before treating this as complete.",
    },
    command_execution_mode: "preview_only",
  };
  data.decision_pages = Object.entries(titles).map(([id, title]) => ({
    id,
    title,
    scope: `${title} producer decision scope`,
    audiences: ["non_engineer", "junior_engineer"],
    status: id === "workflow" ? "stale" : "manual_required",
    decision_question: `What should ${title} decide now?`,
    current_judgment: `${title} needs producer-owned review`,
    top_reason: `${title} is using producer decision data.`,
    evidence_confidence: "manual review required",
    must_review: [`producer.${id}`, "command_preview_boundary"],
    next_safe_action: `Review ${title} evidence`,
    detail_page: `#${id}`,
    owner_source: "dashboard-data",
    source_id: `producer.${id}`,
    authority: "manual_required",
    freshness_state: "stale",
    risk_level: "medium",
    command_execution_mode: "preview_only",
  }));
}

async function expectCenteredSvg(locator, tolerance = 1) {
  const deltas = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const svg = element.querySelector("svg");
      const outer = element.getBoundingClientRect();
      const inner = svg.getBoundingClientRect();
      return Math.abs(inner.top + inner.height / 2 - (outer.top + outer.height / 2));
    }),
  );
  expect(deltas.length).toBeGreaterThan(0);
  expect(Math.max(...deltas)).toBeLessThanOrEqual(tolerance);
}

async function openMobileNavLink(page, target) {
  await page.getByRole("button", { name: /^(Menu|メニュー)$/ }).click();
  await page.getByRole("navigation", { name: "Dashboard categories" }).getByRole("link", { name: new RegExp(target) }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/dashboard-control-center/index.html*", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: fs.readFileSync(path.join(buildRoot, "index.html"), "utf8"),
    });
  });
  await page.route("**/dashboard-control-center/assets/**", async (route) => {
    const url = new URL(route.request().url());
    const assetName = path.basename(url.pathname);
    const assetPath = path.join(buildRoot, "assets", assetName);
    const contentType = assetName.endsWith(".css") ? "text/css" : "application/javascript";
    await route.fulfill({
      contentType,
      body: fs.readFileSync(assetPath),
    });
  });
  await routeDashboardData(page, fixturePath);
  await routeDashboardLiveStatus(page);
});

test.describe("English dashboard control center", () => {
  test.use({ locale: "en-US" });

  test("renders the mock-source overview and detail surfaces from producer data", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    const sourceBoundaryFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    sourceBoundaryFixture.source_commands = Array.from(new Set([
      ...(Array.isArray(sourceBoundaryFixture.source_commands) ? sourceBoundaryFixture.source_commands : []),
      "tools/product-repository-authority status --json",
    ]));
    addDesignSystemRepositoryScope(sourceBoundaryFixture);
    addDesignStudioProposalWorkflowFixture(sourceBoundaryFixture);
    addProducerDecisionPages(sourceBoundaryFixture);
    sourceBoundaryFixture.development.product_authority.evidence_summary.items.push({
      source_id: "product.ci.main",
      context: "product-improvement",
      status: "not_run",
      freshness_state: "not_collected",
      required_in_context: true,
      authority: "manual_required",
      observed_at: "not_collected",
      max_age_seconds: 3600,
      product_root: "[external-product-repository]/task-tracker-repository",
      product_head: "none",
      source_artifacts: "ops/CI_MANIFEST.tsv",
      blocked_by: "product.ci.github_actions",
      next_command: "tools/product-gate-evidence ci-runs product-improvement 3600",
      detail_code: "product.ci.main.detail",
      current_item_id: "product.ci.main",
      detail_manifest_source: "ops/EVIDENCE_DETAIL_MANIFEST.tsv",
      detail_artifact_path: "ops/evidence/product.ci.main.json",
      summary: "Main CI run evidence has not been recorded yet.",
      reason: "CI run evidence is missing for the selected product context.",
      next_action: "Run the product-local ci-runs evidence collector outside the dashboard.",
      risk_level: "critical",
    });
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, sourceBoundaryFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");
    const navigation = page.getByRole("navigation", { name: "Dashboard categories" });
    const repositoryNavigation = page.getByRole("navigation", { name: "Repository" });

    await expect(page.locator(".brand strong", { hasText: "Repository Control Center" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Lessons/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Development Workflow/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Maintenance Sync/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Safety Actions/ })).toBeVisible();
    await expect(repositoryNavigation.locator(".category-nav__link")).toHaveCount(4);
    await expect(repositoryNavigation.getByRole("link", { name: /Design Studio/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Other" }).locator(".category-nav__link")).toHaveCount(2);
    await expect(page.getByText("Read-only except allowed Settings and Design Studio changes.")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Category Health")).toHaveCount(0);
    await expect(page.locator(".menu-tile")).toHaveCount(7);
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await expect(page.locator(".menu-tile[data-menu-tile='free-development']")).toContainText("Free Development");
    await expectCenteredSvg(page.locator(".menu-tile__icon"));
    await expect(page.locator(".context-strip__item")).toHaveCount(4);
    await expect(page.locator(".context-strip")).toContainText(/Step\s*12\s*\/\s*14/);
    await expect(page.locator(".context-strip")).toContainText("task-tracker-repository");
    await expectCenteredSvg(page.locator(".context-strip__icon"));
    await expect(page.locator(".overview-status-card")).toHaveCount(4);
    await expectCenteredSvg(page.locator(".overview-status-card__icon"));
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText("79%");
    await expect(page.locator("[data-overview-status-card='git']")).toContainText("Local/remote sync checked");
    await expect(page.locator("[data-overview-status-card='git']")).not.toContainText("Commit");
    await expect(page.locator("[data-overview-status-card='ci']")).toContainText("CI run status checked");
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Blockers: 1");
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Risky operations, approvals, and blockers checked");
    const overviewProducerDecision = page.locator("#overview .decision-summary--sidebar").first();
    await expect(overviewProducerDecision).toContainText("producer.overview");
    await expect(overviewProducerDecision).toContainText("#overview");
    await expect(overviewProducerDecision).toContainText("dashboard-data");
    const situationBoard = page.locator("[data-operational-situation='true']");
    await expect(situationBoard).toContainText("Operational Situation Board");
    await expect(situationBoard).toContainText("Live observation");
    await expect(situationBoard.locator("[data-operational-situation-fact]")).toHaveCount(5);
    await expect(situationBoard.locator("[data-operational-situation-fact='current-work']")).toContainText("STEP 1-14 Practical lesson");
    await expect(situationBoard.locator("[data-operational-situation-fact='blockers']")).toContainText("6 blocker(s)");
    await expect(situationBoard.locator("[data-operational-situation-fact='git']")).toContainText("Worktree is clean");
    await expect(situationBoard.locator("[data-operational-situation-fact='git']")).toContainText("Branch: main");
    await expect(situationBoard.locator("[data-operational-situation-fact='next-safe']")).toContainText("./tools/product-repository-authority status --json");
    await expect(page.locator(".common-status-card--git .common-status-op")).toHaveCount(4);
    await expect(page.locator(".common-status-card--git .common-status-op", { hasText: "Merge" })).toContainText("Allowed");
    await expectCenteredSvg(page.locator(".common-status-card--git .common-status-op__label"));
    await expect(page.locator(".common-status-card--security")).toContainText("Failures / blockers");
    await expect(page.locator(".common-status-card--security")).toContainText("1");
    await expectCenteredSvg(page.locator(".common-status-card--security .common-status-card__icon"));
    const designSystemStyles = await page.evaluate(() => {
      const read = (selector) => {
        const element = document.querySelector(selector);
        const style = window.getComputedStyle(element);
        return {
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          borderLeftWidth: style.borderLeftWidth,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
        };
      };
      return {
        commonCard: read(".common-status-card--git"),
        pageTitle: read(".page-title"),
      };
    });
    await expect(page.locator(".app-shell")).toHaveAttribute("data-dcc-design-system", "dashboard-control-center");
    expect(designSystemStyles.pageTitle.borderLeftWidth).toBe("1px");
    expect(designSystemStyles.pageTitle.backgroundImage).toBe("none");
    expect(designSystemStyles.pageTitle.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(Number.parseFloat(designSystemStyles.commonCard.borderRadius)).toBeGreaterThanOrEqual(8);
    expect(designSystemStyles.commonCard.boxShadow).not.toBe("none");
    await expect(page.locator(".explore-card")).toHaveCount(4);
    await expect(page.locator(".explore-card", { hasText: "Lessons" })).toContainText("Open");
    await expect(page.getByText("./tools/dashboard lesson")).toHaveCount(0);
    await expect(page.getByText("Preview merge boundary")).toHaveCount(0);

    const overviewCards = await page.locator(".overview-status-card").evaluateAll((cards) =>
      cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { top: Math.round(rect.top), height: Math.round(rect.height) };
      }),
    );
    const rowTops = [...new Set(overviewCards.map((card) => card.top))];
    expect(rowTops.length).toBeLessThanOrEqual(2);
    for (const top of rowTops) {
      const rowHeights = overviewCards.filter((card) => card.top === top).map((card) => card.height);
      expect(Math.max(...rowHeights) - Math.min(...rowHeights)).toBeLessThanOrEqual(3);
    }

    await navigation.getByRole("link", { name: /Lessons/ }).click();
    await expect(page.getByRole("heading", { name: "Lessons" })).toBeVisible();
    await expect(page.locator("#lessons").getByLabel("Detail page decision summary").first()).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    await expect(page.locator(".context-strip")).toContainText(/Step\s*12\s*\/\s*14/);
    await expect(page.locator(".context-strip--lessons .mini-progress-ring--icon")).toHaveCount(1);
    await expect(page.locator("#lessons").getByText("What this page checks").first()).toBeVisible();
    await expect(page.locator("#lessons").getByText("Current judgment").first()).toBeVisible();
    await expect(page.locator("#lessons").getByText("Must review").first()).toBeVisible();
    await expect(page.locator("#lessons").getByText("Next safe check").first()).toBeVisible();
    await expect(page.locator("#lessons .decision-summary--lessons").filter({ hasText: /Check\s*Git\/CI status on the workflow page/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "STEP 1-7 Basic Lesson" })).toBeVisible();
    await expect(page.locator(".lesson-progress-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Applied Lesson" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live status (current execution state)" })).toBeVisible();

    await navigation.getByRole("link", { name: /Development Workflow/ }).click();
    await expect(page.getByRole("heading", { name: "Development Workflow" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    const workflowHeaderStyle = await page.locator("#workflow .page-title").evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        borderLeftWidth: style.borderLeftWidth,
        boxShadow: style.boxShadow,
      };
    });
    expect(workflowHeaderStyle.borderLeftWidth).toBe("1px");
    expect(workflowHeaderStyle.boxShadow).not.toBe("none");
    await expect(page.locator(".operation-chip")).toHaveCount(6);
    await expect(page.locator(".operation-chip", { hasText: "Merge" })).toContainText("Allowed");
    await expect(page.locator(".workflow-mini-card")).toHaveCount(5);
    await expectCenteredSvg(page.locator(".workflow-mini-card__icon"));
    const workflowProducerDecision = page.locator("#workflow .decision-summary--workflow").first();
    await expect(workflowProducerDecision).toContainText("producer.workflow");
    await expect(workflowProducerDecision).toContainText("#workflow");
    const workflowOperationalDetail = page.locator("[data-operational-detail-decisions='workflow']");
    await expect(workflowOperationalDetail).toContainText("Operational detail decisions");
    await expect(workflowOperationalDetail.locator("[data-operational-detail-fact]")).toHaveCount(4);
    await expect(workflowOperationalDetail.locator("[data-operational-detail-fact='git']")).toContainText("Worktree is clean");
    await expect(workflowOperationalDetail.locator("[data-operational-detail-fact='next-safe']")).toContainText("./tools/product-repository-authority status --json");
    await expect(workflowOperationalDetail.locator("[data-operational-detail-evidence-key='git_sync']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Git Sync" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Product Evidence" })).toBeVisible();
    await page.locator(".workflow-mini-card--product-evidence").getByRole("button", { name: /Check collection/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Suggested CI evidence check");
    await expect(page.locator(".insight-detail-modal")).toContainText("display only");
    await expect(page.locator(".insight-detail-modal")).toContainText("tools/product-gate-evidence ci-runs product-improvement 3600");
    await page.locator(".insight-detail-modal__close").click();
    await expect(page.locator(".insight-detail-modal")).toHaveCount(0);
    await page.locator(".workflow-mini-card", { hasText: "Git Sync" }).getByRole("button", { name: /View details/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Workflow detail");
    await expect(page.locator(".insight-detail-modal")).toContainText("Why it matters");
    await expect(page.locator(".insight-detail-modal")).toContainText("Next safe action");
    await expect(page.locator(".insight-detail-modal")).not.toContainText("detail.nextSafeAction");
    await page.locator(".insight-detail-modal__close").click();
    await expect(page.locator(".insight-detail-modal")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Current workflow evidence" })).toBeVisible();
    await expect(page.getByText(/Development\.Product Repository/)).toHaveCount(0);
    await expect(page.getByText("development.git.sync.status")).toHaveCount(0);
    await expect(page.locator(".mock-table-row--workflow")).toHaveCount(5);
    await page.locator(".mock-table-row--workflow").first().getByRole("button", { name: /CI evidence/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("CI status evidence");
    await page.locator(".insight-detail-modal__close").click();

    await navigation.getByRole("link", { name: /Maintenance Sync/ }).click();
    await expect(page.getByRole("heading", { name: "Maintenance Sync" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    const maintenanceOperationalDetail = page.locator("[data-operational-detail-decisions='maintenance']");
    await expect(maintenanceOperationalDetail).toContainText("Operational detail decisions");
    await expect(maintenanceOperationalDetail.locator("[data-operational-detail-fact='blockers']")).toContainText("6 blocker(s)");
    await expectCenteredSvg(page.locator(".maintenance-mini-card__icon"));
    await expect(page.locator(".maintenance-mini-card")).toHaveCount(6);
    await expect(page.locator(".evidence-row")).toHaveCount(6);
    const executionEvidenceRow = page.locator(".evidence-row", { hasText: "Execution evidence" });
    const executionEvidenceReference = executionEvidenceRow.locator(".evidence-row__reference-chip").first();
    const executionEvidenceReferenceValue = executionEvidenceReference.locator(".evidence-row__reference-value");
    await expect(executionEvidenceReference).toContainText("docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv");
    await expect(executionEvidenceReferenceValue).toHaveAttribute("data-tooltip", "Defines product-operation evidence and gate sources.");
    await expect(executionEvidenceReference).not.toContainText("Reference available");
    await expect(executionEvidenceRow.getByRole("button", { name: /PRODUCT_GATE_EVIDENCE_SCHEMA.tsv/ })).toBeVisible();
    const evidenceReferenceGap = await executionEvidenceReference.evaluate((element) => {
      const value = element.querySelector(".evidence-row__reference-value .technical-chip");
      const copy = element.querySelector(".evidence-row__reference-copy");
      if (!value || !copy) {
        return Number.POSITIVE_INFINITY;
      }
      const valueRect = value.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      return Math.round(copyRect.left - valueRect.right);
    });
    expect(evidenceReferenceGap).toBeGreaterThanOrEqual(0);
    expect(evidenceReferenceGap).toBeLessThanOrEqual(6);
    await page.locator(".evidence-row", { hasText: "Execution evidence" }).getByRole("button", { name: /Evidence detail/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Execution evidence");
    await expect(page.locator(".insight-detail-modal")).toContainText("Technical source");
    await page.locator(".insight-detail-modal__close").click();
    await expect(page.getByText("product_git_sync_live")).toHaveCount(0);
    await expect(page.getByText("git_sync.live")).toHaveCount(0);
    await expect(page.getByText("Technical sources used for the saved snapshot")).toBeVisible();
    await page.locator(".source-boundary summary").click();
    await expect(page.getByText("Snapshot source files")).toBeVisible();
    const sourceFileChip = page.locator(".source-boundary__chips--files .source-boundary__chip").first();
    const sourceFileValue = sourceFileChip.locator(".source-boundary__chip-value");
    await expect(sourceFileChip).toContainText("docs/workflow/DASHBOARD_DATA_SCHEMA.tsv");
    await expect(sourceFileValue).toHaveAttribute("data-tooltip", "Dashboard JSON schema that defines fields the UI may trust.");
    await sourceFileValue.hover();
    await expect.poll(() => sourceFileValue.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("visible");
    const sourceFileTooltipStyle = await sourceFileValue.evaluate((element) => {
      const style = getComputedStyle(element, "::after");
      return { backgroundColor: style.backgroundColor, borderColor: style.borderColor, color: style.color };
    });
    expect(sourceFileTooltipStyle.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(sourceFileTooltipStyle.borderColor).toBe("rgb(201, 186, 244)");
    expect(sourceFileTooltipStyle.color).toBe("rgb(36, 26, 53)");
    await page.mouse.move(0, 0);
    await expect.poll(() => sourceFileValue.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("hidden");
    const sourceCopyButton = sourceFileChip.getByRole("button", { name: /DASHBOARD_DATA_SCHEMA.tsv/ });
    await expect(sourceCopyButton).toHaveAttribute("data-copy-tooltip", "docs/workflow/DASHBOARD_DATA_SCHEMA.tsv");
    const sourceFileGap = await sourceFileChip.evaluate((element) => {
      const value = element.querySelector(".source-boundary__chip-value .technical-chip");
      const copy = element.querySelector(".source-boundary__chip-copy");
      if (!value || !copy) {
        return Number.POSITIVE_INFINITY;
      }
      const valueRect = value.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      return Math.round(copyRect.left - valueRect.right);
    });
    expect(sourceFileGap).toBeGreaterThanOrEqual(0);
    expect(sourceFileGap).toBeLessThanOrEqual(6);
    await sourceCopyButton.hover();
    await expect.poll(() => sourceFileValue.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("hidden");
    const copyPopupPosition = await sourceCopyButton.evaluate((element) => {
      const style = getComputedStyle(element, "::after");
      return { backgroundColor: style.backgroundColor, bottom: style.bottom, color: style.color, top: style.top, visibility: style.visibility };
    });
    expect(copyPopupPosition.visibility).toBe("visible");
    expect(copyPopupPosition.backgroundColor).toBe("rgb(17, 24, 32)");
    expect(copyPopupPosition.color).toBe("rgb(255, 255, 255)");
    expect(copyPopupPosition.bottom).not.toBe("auto");
    const sourceCommandChip = page.locator(".source-boundary__chips--commands .source-boundary__chip").first();
    const sourceCommandValue = sourceCommandChip.locator(".source-boundary__chip-value");
    await expect(sourceCommandChip).toContainText("tools/dashboard-data");
    await expect(sourceCommandValue).toHaveAttribute("data-tooltip", "Generates the saved Dashboard JSON snapshot from repository files and recorded settings.");
    await expect(page.getByRole("button", { name: /tools\/dashboard-data/ })).toBeVisible();
    const productAuthorityCommandChip = page.locator(".source-boundary__chips--commands .source-boundary__chip", { hasText: "tools/product-repository-authority status --json" }).first();
    await expect(productAuthorityCommandChip).toBeVisible();
    const productAuthorityCommandGap = await productAuthorityCommandChip.evaluate((element) => {
      const value = element.querySelector(".source-boundary__chip-value .technical-chip");
      const copy = element.querySelector(".source-boundary__chip-copy");
      if (!value || !copy) {
        return Number.POSITIVE_INFINITY;
      }
      const valueRect = value.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      return Math.round(copyRect.left - valueRect.right);
    });
    expect(productAuthorityCommandGap).toBeGreaterThanOrEqual(0);
    expect(productAuthorityCommandGap).toBeLessThanOrEqual(6);

    await navigation.getByRole("link", { name: /Safety Actions/ }).click();
    await expect(page.getByRole("heading", { name: "Safety Actions" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    const safetyOperationalDetail = page.locator("[data-operational-detail-decisions='safety']");
    await expect(safetyOperationalDetail).toContainText("Operational detail decisions");
    await expect(safetyOperationalDetail.locator("[data-operational-detail-fact='blockers']")).toContainText("6 blocker(s)");
    await expectCenteredSvg(page.locator(".security-mini-card__icon"));
    await expect(page.locator(".security-mini-card")).toHaveCount(4);
    const safetyCardIconBackgrounds = await page.locator(".security-mini-card__icon").evaluateAll((icons) => icons.map((icon) => getComputedStyle(icon).backgroundColor));
    expect(safetyCardIconBackgrounds.every((background) => background !== "rgba(0, 0, 0, 0)")).toBe(true);
    await expect(page.locator("#partial-failures-heading")).toBeVisible();
    await expect(page.locator(".failure-row")).toHaveCount(1);
    await expect(page.locator(".failure-row", { hasText: "Required evidence has not been collected yet." })).toBeVisible();
    await page.locator(".failure-row", { hasText: "Required evidence has not been collected yet." }).getByRole("button", { name: /Failure detail/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Partial Failures table");
    await page.locator(".insight-detail-modal__close").click();
    await expect(page.getByText("security_gate")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Command Previews (display only)" })).toBeVisible();
    await expect(page.locator(".display-only-badge").first()).toContainText("Display only");
    await expect(page.getByText("preview_only")).toHaveCount(0);
    await expect(page.getByText("git_workflow_merge_approval")).toHaveCount(0);
    await expect(page.locator(".command-preview")).toHaveCount(4);
    await expect(page.locator(".command-preview .command-chip")).toHaveCount(4);
    await expect(page.locator(".command-preview__command-value").first()).toHaveAttribute("data-tooltip", "Display-only command preview.");
    await expect(page.locator(".security-policy-rule")).toHaveCount(5);
    await expect(page.locator(".security-policy-rule", { hasText: "Protect secrets" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Run|Execute|Apply|Merge|Push|Check)$/i })).toHaveCount(0);
    await expect(page.locator("[data-state='approval_required']").first()).toBeVisible();

    await repositoryNavigation.getByRole("link", { name: /Documents/ }).click();
    const documentsView = page.locator("#documents");
    await expect(documentsView).toBeVisible();
    await expect(documentsView.locator("#documents-brief")).toBeVisible();
    await expect(documentsView.locator(".documents-brief-card")).toHaveCount(5);
    await expect(documentsView.locator(".documents-brief-card", { hasText: "Decide the product being built" })).toContainText("Requirements");
    await expect(documentsView.locator(".documents-brief-card", { hasText: "Decide current progress" })).toContainText("Task tracker");
    await documentsView.locator(".documents-brief-card", { hasText: "Decide the product being built" }).click();
    await expect(page.locator(".documents-brief-modal")).toBeVisible();
    await expect(page.locator(".documents-brief-modal")).toContainText("Source document");
    await expect(page.locator(".documents-brief-modal")).toContainText("What the documents say now");
    await page.locator(".documents-brief-modal__close").click();
    await expect(documentsView.locator("#documents-next-actions .documents-next-row")).toHaveCount(3);
    await expect(page.locator(".evidence-row")).toHaveCount(0);
    await expect(page.getByText("Information sources for this view")).toHaveCount(0);
    await expect(documentsView.locator("#documents-related a[href='#maintenance']")).toBeVisible();
    await expect(documentsView.locator("#documents-related .sidebar-page-link-card")).toHaveCount(3);

    const settingsCalls = [];
    await routeSettingsApi(page, settingsCalls);
    await repositoryNavigation.getByRole("link", { name: /Settings/ }).click();
    const settingsView = page.locator("#settings");
    await expect(settingsView).toBeVisible();
    await expect(settingsView).toHaveAttribute("data-dashboard-display-depth", "standard");
    await expect(settingsView.locator(".settings-row")).toHaveCount(fixtureSettingsCount);
    await expect(settingsView.locator(".settings-change-chip")).toHaveCount(0);
    const learningModeRow = settingsView.locator(".settings-row", { hasText: "Learning mode" });
    await expect(learningModeRow.locator(".settings-row__open")).toContainText("Editable here");
    await expect(learningModeRow.locator(".settings-row__meta")).not.toContainText("Editable here");
    await expect(learningModeRow).toContainText("Lessons");
    const productNameRow = settingsView.locator(".settings-row", { hasText: "Product name" });
    await expect(productNameRow.locator(".settings-row__open")).toContainText("Review");
    await expect(productNameRow.locator(".settings-row__meta")).not.toContainText("Review only");
    await expect(productNameRow).toContainText("Repository Info");
    const displayDepthRow = settingsView.locator(".settings-row[data-settings-row-id='dashboard_display_depth']");
    await expect(displayDepthRow).toContainText("Dashboard display depth");
    await expect(displayDepthRow).toContainText("Standard");
    await expect(displayDepthRow.locator(".settings-row__open")).toContainText("Editable here");
    await displayDepthRow.click();
    await expect(page.locator(".settings-modal__allowed")).toContainText("Guide");
    await expect(page.locator(".settings-modal__allowed")).toContainText("Standard");
    await expect(page.locator(".settings-modal__allowed")).toContainText("Technical detail");
    await expect(page.locator(".settings-value-select select")).toContainText("Technical detail");
    await page.locator(".settings-modal__close").click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    const branchAllowedRow = settingsView.locator(".settings-row[data-settings-row-id='git_branch_allowed']");
    await expect(branchAllowedRow).toContainText("Allowed");
    await branchAllowedRow.click();
    await expect(page.locator(".settings-modal__allowed")).toContainText("Allowed");
    await expect(page.locator(".settings-modal__allowed")).toContainText("Not allowed");
    await expect(page.locator(".settings-modal__automation-note")).toHaveCount(0);
    await page.locator(".settings-modal__close").click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    const developerAutoMergeRow = settingsView.locator(".settings-row[data-settings-row-id='git_developer_auto_merge_allowed']");
    await expect(developerAutoMergeRow).toContainText("Allowed");
    await developerAutoMergeRow.click();
    await expect(page.locator(".settings-modal__allowed")).toContainText("Allowed");
    await expect(page.locator(".settings-modal__allowed")).toContainText("Not allowed");
    await expect(page.locator(".settings-value-select select")).toContainText("Allowed");
    await expect(page.locator(".settings-value-select select")).toContainText("Not allowed");
    await expect(page.locator(".settings-modal__automation-note")).toHaveCount(0);
    await page.locator(".settings-modal__close").click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(settingsView.locator(".settings-row[data-settings-row-id='git_push_automation']").locator(".settings-row__open")).toContainText("Editable here");
    const mergeExecutionRow = settingsView.locator(".settings-row[data-settings-row-id='git_merge_execution']");
    await expect(mergeExecutionRow.locator(".settings-row__open")).toContainText("Editable here");
    await expect(mergeExecutionRow).toContainText("After approval");
    await mergeExecutionRow.click();
    await expect(page.locator(".settings-modal__allowed")).toContainText("Ask each time");
    await expect(page.locator(".settings-modal__allowed")).toContainText("After approval");
    await expect(page.locator(".settings-value-select select")).toContainText("Ask each time");
    await expect(page.locator(".settings-value-select select")).toContainText("After approval");
    await expect(page.locator(".settings-modal__automation-note")).toHaveCount(1);
    await expect(page.locator(".settings-modal__automation-note")).toContainText("requires an approval");
    await expect(page.locator(".settings-modal__git-note")).toContainText("are not executed from this screen");
    await page.locator(".settings-modal__close").click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await learningModeRow.click();
    await expect(page.locator(".settings-modal")).toBeVisible();
    await expect(page.locator(".settings-modal__close")).toBeFocused();
    const modalEyebrowSize = await page.locator(".settings-modal__header small").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const modalStatusSize = await page.locator(".settings-modal__status > div > span").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(modalEyebrowSize).toBeGreaterThan(modalStatusSize);
    await expect(page.locator(".settings-modal__allowed")).toContainText("A: Detailed guidance");
    await expect(page.locator(".settings-modal__allowed")).toContainText("B: Short guidance");
    await expect(page.locator(".settings-modal__allowed")).toContainText("C: Workflow only");
    await expect(page.locator(".settings-value-select select")).toContainText("A: Detailed guidance");
    await expect(page.locator(".settings-value-select select")).toContainText("B: Short guidance");
    await expect(page.locator(".settings-value-select select")).toContainText("C: Workflow only");
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".settings-modal__footer button")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator(".settings-modal__close")).toBeFocused();
    await expect(page.locator(".settings-modal")).toContainText("Proposed value");
    await page.locator(".settings-value-select select").selectOption("B");
    await page.getByRole("button", { name: /Review change/ }).click();
    await expect(page.locator(".settings-result")).toContainText("Plan ready");
    await expect(page.locator(".settings-result")).toContainText("Technical details");
    await page.getByLabel("I confirm this settings update.").check();
    await page.unroute(dashboardDataRoutePattern);
    const updatedSettingsFixture = addDesignStudioProposalWorkflowFixture(addDesignSystemRepositoryScope(dashboardSettingFixture("learning_mode", "B", "6")));
    await routeDashboardDataPayload(page, updatedSettingsFixture);
    await page.getByRole("button", { name: /Apply setting/ }).click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(page.locator(".settings-apply-feedback")).toHaveCount(0);
    await expect(learningModeRow).toContainText("B: Short guidance");
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
    expect(settingsCalls[1].payload).toMatchObject({
      setting_id: "learning_mode",
      value: "B",
      menu_id: "step_1_14",
      plan_token: "22222222-2222-4222-8222-222222222222",
      snapshot_id: sourceBoundaryFixture.snapshot_id,
      content_hash: sourceBoundaryFixture.content_hash,
      confirm: true,
    });

    const designSystemCalls = [];
    await routeDesignSystemApi(page, designSystemCalls);
    await repositoryNavigation.getByRole("link", { name: /Design Studio/ }).click();
    const designStudioView = page.locator("#design-studio");
    await expect(designStudioView).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design Studio" })).toBeVisible();
    await expect(designStudioView).toContainText("Edit design source");
    await expect(designStudioView).toContainText("Proposal orchestration foundation");
    await expect(designStudioView).toContainText("Candidate envelope");
    await expect(designStudioView).toContainText("Design intent request");
    await expect(designStudioView).toContainText("API key mode");
    await expect(designStudioView).toContainText("External product repository");
    await expect(designStudioView).toContainText("Direct apply authority: No");
    await expect(designStudioView).toContainText("Imported proposal workflow");
    await expect(designStudioView).toContainText("Latest candidate");
    await expect(designStudioView).toContainText("Latest proposal");
    await expect(designStudioView).toContainText("Operation count");
    await expect(designStudioView).toContainText("Plan only");
    await expect(designStudioView).toContainText("Dry run");
    await expect(designStudioView).toContainText("No provider dispatch");
    await expect(designStudioView).toContainText("No image generation");
    await expect(designStudioView).toContainText("tools/check_dashboard_design_system.sh");
    const orchestrationPanel = designStudioView.locator("#design-studio-orchestration");
    await expect(orchestrationPanel).not.toHaveAttribute("open", "");
    await expect(orchestrationPanel.locator(".design-studio-orchestration")).not.toBeVisible();
    await expect(orchestrationPanel.locator("summary")).toContainText("Open when needed");
    await orchestrationPanel.locator("summary").click();
    await expect(orchestrationPanel).toHaveAttribute("open", "");
    await expect(orchestrationPanel.locator(".design-studio-orchestration")).toBeVisible();
    await expect(orchestrationPanel.locator("summary")).toContainText("Close");
    const productDesignTarget = designStudioView.locator("[data-design-target='external-product']");
    const productDesignChip = productDesignTarget.locator(".source-boundary__chip", { hasText: "product:docs/design-system/DESIGN_SYSTEM.md" }).first();
    const productDesignValue = productDesignChip.locator(".source-boundary__chip-value");
    await expect(productDesignChip).toBeVisible();
    await expect(productDesignValue).toHaveAttribute("data-tooltip", "Design system source. Defines visual rules, tokens, components, or UI contracts.");
    await productDesignValue.hover();
    await expect.poll(() => productDesignValue.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("visible");
    await page.mouse.move(0, 0);
    const productDesignCopy = productDesignChip.getByRole("button", { name: /DESIGN_SYSTEM\.md/ });
    await expect(productDesignCopy.locator("svg")).toHaveCount(1);
    await productDesignCopy.hover();
    await expect.poll(() => productDesignCopy.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("visible");
    await page.mouse.move(0, 0);
    await expect(designStudioView.getByLabel("Theme accent")).toContainText("Blue");
    await expect(designStudioView.getByLabel("Density")).toContainText("Balanced");
    await expect(designStudioView.getByLabel("Radius scale")).toContainText("Standard");
    await expect(designStudioView.getByLabel("Typography scale")).toContainText("Standard");
    await expect(designStudioView.getByLabel("Value-copy gap")).toContainText("4px");
    await expect(designStudioView.getByLabel("Source path width")).toContainText("260px");
    await expect(designStudioView.getByLabel("Evidence path width")).toContainText("292px");
    await expect(designStudioView.getByLabel("Preview chip width")).toContainText("360px");
    await expect(designStudioView.getByLabel("Card padding")).toContainText("14px");
    await expect(designStudioView.getByLabel("Card gap")).toContainText("10px");
    await expect(designStudioView.getByLabel("Row padding")).toContainText("10px 12px");
    await expect(designStudioView.getByLabel("Row gap")).toContainText("10px");
    await expect(designStudioView.getByLabel("File/path tooltip display")).toContainText("Show on hover");
    await expect(designStudioView.getByLabel("Copy popup display")).toContainText("Show on hover");
    await expect(designStudioView.getByLabel("Copy popup placement")).toContainText("Top");
    const interactionPresetPreview = designStudioView.locator("[data-preview-for='interactions']");
    const interactionPresetChip = interactionPresetPreview.locator(".source-boundary__chip", { hasText: "product:docs/design-system/DESIGN_SYSTEM.md" });
    const interactionPresetValue = interactionPresetChip.locator(".source-boundary__chip-value");
    await expect(interactionPresetValue).toHaveAttribute("data-tooltip", "Role explanation shown only while the pointer is over the chip.");
    await interactionPresetValue.hover();
    await expect.poll(() => interactionPresetValue.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("visible");
    await page.mouse.move(0, 0);
    const interactionPresetCopy = interactionPresetChip.getByRole("button", { name: /DESIGN_SYSTEM\.md/ });
    await expect(interactionPresetCopy.locator("svg")).toHaveCount(1);
    await expect.poll(() => interactionPresetCopy.evaluate((element) => element.textContent.trim())).toBe("");
    await interactionPresetCopy.hover();
    await expect.poll(() => interactionPresetCopy.evaluate((element) => getComputedStyle(element, "::after").visibility)).toBe("visible");
    await page.mouse.move(0, 0);
    const draftDiff = designStudioView.locator(".design-studio-diff");
    await expect(draftDiff).not.toHaveAttribute("open", "");
    await expect(draftDiff.locator("summary")).toContainText("Show all");
    await expect(draftDiff.locator("dl")).not.toBeVisible();
    await draftDiff.locator("summary").click();
    await expect(draftDiff).toHaveAttribute("open", "");
    await expect(draftDiff.locator("dl")).toBeVisible();
    await expect(draftDiff).toContainText("Theme accent");
    const designStudioLayout = await designStudioView.locator(".design-studio-grid").evaluate((element) => {
      const editor = element.querySelector(".design-studio-editor");
      const preview = element.querySelector(".design-studio-preview");
      if (!editor || !preview) {
        return null;
      }
      const editorRect = editor.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      return {
        editorBottom: Math.round(editorRect.bottom),
        editorLeft: Math.round(editorRect.left),
        previewLeft: Math.round(previewRect.left),
        previewTop: Math.round(previewRect.top),
      };
    });
    expect(designStudioLayout).not.toBeNull();
    expect(designStudioLayout.previewTop).toBeGreaterThan(designStudioLayout.editorBottom);
    expect(Math.abs(designStudioLayout.previewLeft - designStudioLayout.editorLeft)).toBeLessThanOrEqual(2);
    const designPreviewChipLayout = await designStudioView.locator(".design-studio-preview__sample--molecule .design-studio-preview__chip").evaluate((element) => {
      const value = element.querySelector(".source-boundary__chip-value .technical-chip");
      const copy = element.querySelector(".source-boundary__chip-copy");
      if (!value || !copy) {
        return null;
      }
      const valueRect = value.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      return {
        gap: Math.round(copyRect.left - valueRect.right),
        verticalDelta: Math.round(Math.abs(copyRect.top + copyRect.height / 2 - (valueRect.top + valueRect.height / 2))),
      };
    });
    expect(designPreviewChipLayout).not.toBeNull();
    expect(designPreviewChipLayout.gap).toBeGreaterThanOrEqual(3);
    expect(designPreviewChipLayout.gap).toBeLessThanOrEqual(6);
    expect(designPreviewChipLayout.verticalDelta).toBeLessThanOrEqual(4);
    const previewBadgeLayout = await designStudioView.locator(".design-studio-preview__sample--molecule").evaluate((element) => {
      const status = element.querySelector(".status");
      const mode = element.querySelector(".mode-pill");
      if (!status || !mode) {
        return null;
      }
      const read = (target) => {
        const rect = target.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          scrollHeight: Math.round(target.scrollHeight),
          width: Math.round(rect.width),
          scrollWidth: Math.round(target.scrollWidth),
          whiteSpace: getComputedStyle(target).whiteSpace,
        };
      };
      return { status: read(status), mode: read(mode) };
    });
    expect(previewBadgeLayout).not.toBeNull();
    expect(previewBadgeLayout.status.whiteSpace).toBe("nowrap");
    expect(previewBadgeLayout.mode.whiteSpace).toBe("nowrap");
    expect(previewBadgeLayout.status.scrollHeight).toBeLessThanOrEqual(previewBadgeLayout.status.height + 1);
    expect(previewBadgeLayout.mode.scrollHeight).toBeLessThanOrEqual(previewBadgeLayout.mode.height + 1);
    expect(previewBadgeLayout.status.scrollWidth).toBeLessThanOrEqual(previewBadgeLayout.status.width + 1);
    expect(previewBadgeLayout.mode.scrollWidth).toBeLessThanOrEqual(previewBadgeLayout.mode.width + 1);
    await designStudioView.getByLabel("Theme accent").selectOption("teal");
    await designStudioView.getByLabel("Density").selectOption("comfortable");
    await designStudioView.getByLabel("Radius scale").selectOption("soft");
    await designStudioView.getByLabel("Typography scale").selectOption("large");
    await designStudioView.getByLabel("Action button height").selectOption("38px");
    await designStudioView.getByLabel("Action button padding").selectOption("9px 13px");
    await designStudioView.getByLabel("Compact button height").selectOption("34px");
    await designStudioView.getByLabel("Compact button padding").selectOption("6px 12px");
    await designStudioView.getByLabel("Select height").selectOption("44px");
    await designStudioView.getByLabel("Select padding").selectOption("0 12px");
    await designStudioView.getByLabel("Icon button size").selectOption("42px");
    await designStudioView.getByLabel("Control text size").selectOption("0.9rem");
    await designStudioView.getByLabel("Card padding").selectOption("16px");
    await designStudioView.getByLabel("Card gap").selectOption("12px");
    await designStudioView.getByLabel("Row padding").selectOption("12px 14px");
    await designStudioView.getByLabel("Row gap").selectOption("12px");
    await designStudioView.getByLabel("Value-copy gap").selectOption("6px");
    await designStudioView.getByLabel("Source path width").selectOption("300px");
    await designStudioView.getByLabel("Evidence path width").selectOption("320px");
    await designStudioView.getByLabel("Preview chip width").selectOption("420px");
    await designStudioView.getByLabel("Page header padding").selectOption("20px 22px");
    await designStudioView.getByLabel("Metadata gap").selectOption("10px");
    await designStudioView.getByLabel("Page icon size").selectOption("56px");
    await designStudioView.getByLabel("Badge icon gap").selectOption("6px");
    await designStudioView.getByLabel("Badge height").selectOption("28px");
    await designStudioView.getByLabel("Mode badge padding").selectOption("5px 16px");
    await designStudioView.getByLabel("Status text size").selectOption("0.8rem");
    await designStudioView.getByLabel("Mode text size").selectOption("0.82rem");
    await designStudioView.getByLabel("File/path tooltip max width").selectOption("360px");
    await designStudioView.getByLabel("Copy popup display").selectOption("disabled");
    await designStudioView.getByLabel("Copy popup duration").selectOption("1800");
    await designStudioView.getByRole("button", { name: /Review change/ }).click();
    await expect(designStudioView.locator(".design-studio-result")).toContainText("Plan ready");
    await designStudioView.getByLabel("I confirm this design-system update.").check();
    await designStudioView.getByRole("button", { name: /Apply design system/ }).click();
    await expect(designStudioView.locator(".design-studio-result")).toContainText("Applied");
    expect(designSystemCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
    expect(designSystemCalls[1].payload).toMatchObject({
      component_id: "tooltip-copy",
      target_scope: "dashboard-control-center",
      theme_accent: "teal",
      density: "comfortable",
      radius_scale: "soft",
      typography_scale: "large",
      action_control_height: "38px",
      action_control_padding: "9px 13px",
      compact_control_height: "34px",
      compact_control_padding: "6px 12px",
      form_control_height: "44px",
      form_control_padding: "0 12px",
      icon_button_size: "42px",
      control_font_size: "0.9rem",
      card_padding: "16px",
      card_gap: "12px",
      row_padding: "12px 14px",
      row_gap: "12px",
      technical_affordance_gap: "6px",
      technical_source_max_width: "300px",
      technical_evidence_max_width: "320px",
      technical_preview_chip_max_width: "420px",
      page_header_padding: "20px 22px",
      metadata_gap: "10px",
      page_icon_size: "56px",
      badge_gap: "6px",
      badge_height: "28px",
      mode_badge_padding: "5px 16px",
      badge_font_size: "0.8rem",
      mode_badge_font_size: "0.82rem",
      tooltip_trigger: "hover-only",
      tooltip_hide_policy: "pointer-leave",
      tooltip_placement: "top",
      tooltip_max_width: "360px",
      copy_feedback_trigger: "disabled",
      copy_feedback_hide_policy: "pointer-leave",
      copy_feedback_placement: "top",
      copy_feedback_collision: "shift",
      copy_feedback_duration_ms: "1800",
      plan_token: "11111111-1111-4111-8111-111111111111",
      confirm: true,
    });

    const supportNavigation = page.getByRole("navigation", { name: "Other" });
    await supportNavigation.getByRole("link", { name: /Update History/ }).click();
    const historyView = page.locator("#history");
    await expect(historyView).toContainText("Design Studio history");
    await expect(historyView).toContainText("History rows");
    await expect(historyView).toContainText("Request event");
    await expect(historyView).toContainText("Imported record");
    await expect(historyView).toContainText("DesignChangeProposal");
    await expect(historyView).toContainText("tools/check_dashboard_design_system.sh");
    await expect(historyView).toContainText("No provider dispatch");
    await expect(historyView).toContainText("No image generation");
    await expect(historyView).not.toContainText("intent_text");
    await expect(historyView).not.toContainText("operations");
    await expect(historyView).not.toContainText("payload");
    await supportNavigation.getByRole("link", { name: /Help/ }).click();
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await expect(page.locator(".glossary-category")).toHaveCount(8);
    await expect(page.locator(".sidebar-glossary-card")).toHaveCount(64);
    await page.locator(".sidebar-glossary-card", { hasText: "repository-development-workflow" }).getByRole("button", { name: /Open details/ }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Workflow skills");
    await expect(page.locator(".insight-detail-modal")).toContainText("Why it matters");
    await page.keyboard.press("Escape");
    await expect(page.locator(".insight-detail-modal")).toHaveCount(0);
  });

  test("collapses technical references in friendly display depth while preserving safety actions", async ({ page }) => {
    const friendlyFixture = dashboardSettingFixture("dashboard_display_depth", "friendly", "f");
    addProducerDecisionPages(friendlyFixture);
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, friendlyFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#safety");

    const safetyView = page.locator("#safety");
    await expect(safetyView).toBeVisible();
    await expect(safetyView.locator(".decision-summary__technical").first()).toHaveAttribute("data-dashboard-display-depth", "friendly");
    await expect(safetyView.locator(".decision-summary__technical").first()).not.toHaveAttribute("open", "");
    await expect(page.getByRole("heading", { name: "Command Previews (display only)" })).toBeVisible();
    await expect(safetyView.locator(".command-preview__technical").first()).toHaveAttribute("data-dashboard-display-depth", "friendly");
    await expect(safetyView.locator(".command-preview__technical").first()).not.toHaveAttribute("open", "");
    await expect(safetyView.locator(".display-only-badge").first()).toContainText("Display only");
    await expect(safetyView.locator("[data-state='approval_required']").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Run|Execute|Apply|Merge|Push|Check)$/i })).toHaveCount(0);
  });

  test("keeps standard display depth as the current disclosure baseline", async ({ page }) => {
    const standardFixture = dashboardSettingFixture("dashboard_display_depth", "standard", "d");
    addProducerDecisionPages(standardFixture);
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, standardFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#safety");

    const safetyView = page.locator("#safety");
    await expect(safetyView).toBeVisible();
    await expect(safetyView.locator(".decision-summary__technical")).toHaveCount(0);
    await expect(safetyView.locator(".command-preview__technical")).toHaveCount(0);
    await expect(safetyView.locator(".command-preview .command-chip")).toHaveCount(4);

    await page.goto("http://lesson.local/dashboard-control-center/index.html#repository-info");
    const sourceBoundary = page.locator("#repository-info .source-boundary");
    await expect(sourceBoundary).toHaveAttribute("data-dashboard-display-depth", "standard");
    await expect(sourceBoundary).not.toHaveAttribute("open", "");
  });

  test("opens source and technical details by default in technical display depth", async ({ page }) => {
    const technicalFixture = dashboardSettingFixture("dashboard_display_depth", "technical", "c");
    addProducerDecisionPages(technicalFixture);
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, technicalFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#repository-info");

    const repositoryView = page.locator("#repository-info");
    await expect(repositoryView).toBeVisible();
    await expect(repositoryView.locator(".decision-summary__technical").first()).toHaveAttribute("data-dashboard-display-depth", "technical");
    await expect(repositoryView.locator(".decision-summary__technical").first()).toHaveAttribute("open", "");
    await expect(repositoryView.locator(".decision-summary__technical").first()).toContainText("producer.repository-info");
    const sourceBoundary = repositoryView.locator(".source-boundary");
    await expect(sourceBoundary).toHaveAttribute("data-dashboard-display-depth", "technical");
    await expect(sourceBoundary).toHaveAttribute("open", "");

    await page.goto("http://lesson.local/dashboard-control-center/index.html#safety");
    const safetyView = page.locator("#safety");
    await expect(safetyView.locator(".command-preview__technical").first()).toHaveAttribute("data-dashboard-display-depth", "technical");
    await expect(safetyView.locator(".command-preview__technical").first()).toHaveAttribute("open", "");
    await expect(safetyView.locator(".command-preview .command-chip")).toHaveCount(4);
  });

  test("renders every dashboard page without losing selected context", async ({ page }) => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const methods = [];
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, fixture, methods);
    await page.setViewportSize({ width: 1440, height: 980 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    const pages = [
      ["overview", "Dashboard"],
      ["lessons", "Lessons"],
      ["workflow", "Development Workflow"],
      ["maintenance", "Maintenance Sync"],
      ["safety", "Safety Actions"],
      ["repository-info", "Repository Info"],
      ["documents", "Documents"],
      ["settings", "Settings"],
      ["design-studio", "Design Studio"],
      ["help", "Help"],
      ["history", "Update History"],
    ];
    for (const [viewId, heading] of pages) {
      await page.evaluate((hash) => {
        window.location.hash = hash === "overview" ? "" : `#${hash}`;
      }, viewId);
      await expect(page.locator(`#${viewId}`)).toBeVisible();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
      await expect(page.getByText("Dashboard Data Unavailable")).toHaveCount(0);
      const refreshControl = page.locator(`#${viewId} .refresh-button, #${viewId} .detail-page-header__action`).first();
      await expect(refreshControl).toBeVisible();
      await expect.poll(() => refreshControl.evaluate((element) => element.tagName)).toBe("BUTTON");
      await page.evaluate(() => {
        window.__dashboardReloadMarker = "kept";
      });
      const requestCountBeforeRefresh = methods.length;
      await refreshControl.click();
      await expect.poll(() => methods.length).toBe(requestCountBeforeRefresh + 1);
      await expect.poll(() => page.evaluate(() => window.__dashboardReloadMarker)).toBe("kept");
      await expect(page.locator(".context-switch-progress")).toHaveCount(0);
    }
  });

  test("uses one active menu context across overview and detail pages", async ({ page }) => {
    const activeContextFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    for (const menuId of ["product-improvement"]) {
      const available = activeContextFixture.available_contexts.find((context) => context.menu_id === menuId);
      if (available) {
        Object.assign(available, {
          status: "ready",
          selectable: true,
          disabled_reason_key: "context.menuAvailability.selectable",
          disabled_detail: "This menu can be inspected from the current dashboard snapshot.",
          required_next_action: "Review the selected dashboard context before acting.",
        });
      }
      if (activeContextFixture.contexts_by_menu?.[menuId]) {
        activeContextFixture.contexts_by_menu[menuId] = {
          ...activeContextFixture.contexts_by_menu[menuId],
          evidence_status: "ready",
          security_status: "ready",
          git_status: "ready",
          ci_status: "ready",
          blockers: [],
        };
      }
    }
    const productImprovementFixture = selectedMenuProducerFixture(activeContextFixture, "product-improvement", "e");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [activeContextFixture, productImprovementFixture]);
    await page.setViewportSize({ width: 1440, height: 980 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await page.locator(".menu-tile[data-menu-tile='product-improvement']").click();

    await expect(page.locator(".menu-tile[data-menu-tile='product-improvement']")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Improve Product");
    await expect(page.locator(".context-strip")).toContainText("attendance-management-repository");
    await expect(page.locator(".context-strip")).toContainText(/Product improvement workflow/i);
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Blockers: 0");

    const categoryNavigation = page.getByRole("navigation", { name: "Dashboard categories" });
    await categoryNavigation.getByRole("link", { name: "Development Workflow", exact: true }).click();
    await expect(page.locator("#workflow .context-strip")).toContainText("attendance-management-repository");
    await expect(page.locator("#workflow .context-strip")).toContainText(/Product improvement workflow/i);
    await expect(page.locator("#workflow")).toContainText("Improve Product");

    await categoryNavigation.getByRole("link", { name: "Safety Actions", exact: true }).click();
    await expect(page.locator("#safety .context-strip")).toContainText("Improve Product");
    await expect(page.locator("#safety .context-strip")).toContainText("attendance-management-repository");
  });

  test("keeps unavailable menus from replacing the active context and explains why", async ({ page }) => {
    const unavailableFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const unavailableContext = unavailableFixture.available_contexts.find((context) => context.menu_id === "step_1_7");
    Object.assign(unavailableContext, {
      selectable: false,
      disabled_reason_key: "context.menuAvailability.lessonMissing",
      disabled_detail: "The lesson state for this menu is missing or has not started.",
      required_next_action: "./tools/lesson status",
    });
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, unavailableFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    const unavailableTile = page.locator(".menu-tile[data-menu-tile='step_1_7']");
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await expect(unavailableTile).toHaveAttribute("data-menu-selectable", "false");
    await unavailableTile.click({ force: true });

    await expect(unavailableTile).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await expect(page.locator(".context-strip")).toContainText("task-tracker-repository");
    await expect(page.locator(".menu-tile-notice")).toContainText("This lesson is not started.");
    await expect(page.locator(".menu-tile-notice")).toContainText("./tools/lesson status");
  });

  test("keeps not-started workflow menus unavailable and keeps free-development repository scope across pages", async ({ page }) => {
    const workflowFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(workflowFixture);
    workflowFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      workflowFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    for (const menuId of ["advanced", "product-improvement", "external-integration", "lesson-repository-improvement"]) {
      const available = workflowFixture.available_contexts.find((context) => context.menu_id === menuId);
      Object.assign(available, {
        status: "not_run",
        selectable: false,
        disabled_reason_key: "context.menuAvailability.notStarted",
        disabled_detail: "This menu has not been started yet.",
        required_next_action:
          menuId === "advanced"
            ? "./tools/menu start 3 --confirm"
            : menuId === "product-improvement"
              ? "./tools/product-improvement start --confirm"
              : menuId === "external-integration"
                ? "./tools/external-integration start --confirm"
                : "./tools/menu start 7 --confirm",
      });
      workflowFixture.contexts_by_menu[menuId] = {
        ...workflowFixture.contexts_by_menu[menuId],
        evidence_status: "not_run",
      };
    }
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataWithDelays(page, [workflowFixture, freeDevelopmentFixture], [], [0, 900]);
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    for (const menuId of ["advanced", "product-improvement", "external-integration", "lesson-repository-improvement"]) {
      const tile = page.locator(`.menu-tile[data-menu-tile='${menuId}']`);
      await expect(tile).toHaveAttribute("data-menu-selectable", "false");
      await tile.click({ force: true });
      await expect(tile).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".menu-tile-notice")).toContainText("This menu has not been started.");
    }

    await page.locator(".menu-tile[data-menu-tile='free-development']").click();
    const switchProgress = page.locator(".context-switch-progress");
    await expect(switchProgress).toBeVisible();
    await expect(switchProgress).toContainText("Preparing the selected menu");
    await expect(switchProgress).toContainText("Current display");
    await expect(switchProgress).toContainText(/STEP 1-14\s*Practical lesson/);
    await expect(switchProgress).toContainText("Free Development");
    await expect(switchProgress).toContainText("frame-cue");
    const switchPanelBox = await page.locator(".context-switch-progress__panel").boundingBox();
    const switchOverlayBox = await switchProgress.boundingBox();
    expect(switchPanelBox).not.toBeNull();
    expect(switchOverlayBox).not.toBeNull();
    const switchPanelCenterX = switchPanelBox.x + switchPanelBox.width / 2;
    const switchPanelCenterY = switchPanelBox.y + switchPanelBox.height / 2;
    const switchOverlayCenterX = switchOverlayBox.x + switchOverlayBox.width / 2;
    const switchOverlayCenterY = switchOverlayBox.y + switchOverlayBox.height / 2;
    expect(Math.abs(switchPanelCenterX - switchOverlayCenterX)).toBeLessThanOrEqual(16);
    expect(Math.abs(switchPanelCenterY - switchOverlayCenterY)).toBeLessThanOrEqual(16);
    await expect(page.locator(".context-switch-banner")).toHaveCount(0);
    await expect(page.locator(".menu-tile-notice--pending")).toHaveCount(0);
    await expect(page.locator(".menu-tile[data-menu-tile='free-development']")).toHaveAttribute("aria-pressed", "true");
    await expect(switchProgress).toHaveCount(0);
    const freeContext = freeDevelopmentFixture.contexts_by_menu["free-development"];
    const freeRepoName = repositoryDisplayName(freeContext.target_repository.name);
    await expect(page.locator(".context-strip")).toContainText(freeRepoName);
    await expect(page.locator(".context-strip")).not.toContainText("task-tracker-repository");
    await expect(page.locator("[data-overview-status-card='workflow']")).toContainText("Local tests");
    await expect(page.locator("[data-overview-status-card='workflow']")).not.toContainText("Lesson Progress");
    const workflowStatusCard = page.locator("[data-overview-status-card='workflow']");
    await expect(workflowStatusCard.locator(".overview-status-card__head strong")).toHaveText("Local test evidence not collected");
    await expect(workflowStatusCard).toContainText("local test evidence");
    await expect(workflowStatusCard).not.toContainText("Required docs");
    await expect(workflowStatusCard).not.toContainText("Product decision evidence");
    await expect(workflowStatusCard.locator(".status-chip")).not.toHaveText("Local tests");
    await expect(workflowStatusCard).not.toContainText(/Free development workflow/i);
    const gitStatusCard = page.locator("[data-overview-status-card='git']");
    const ciStatusCard = page.locator("[data-overview-status-card='ci']");
    const securityStatusCard = page.locator("[data-overview-status-card='security']");
    await expect(gitStatusCard.locator(".overview-status-card__head strong")).toHaveText("Local/remote sync checked");
    await expect(gitStatusCard).toContainText(freeRepoName);
    await expect(gitStatusCard).toContainText("Last checked");
    await expect(gitStatusCard).not.toContainText("Commit");
    await expect(gitStatusCard).not.toContainText("PR creation");
    await expect(gitStatusCard).not.toContainText("Main CI");
    await expect(gitStatusCard).not.toContainText("task-tracker-repository");
    await expect(gitStatusCard.locator(".status-chip")).not.toHaveText("Git operations and sync");
    await expect(ciStatusCard.locator(".overview-status-card__head strong")).toHaveText("CI run status checked");
    await expect(ciStatusCard).toContainText("Last checked");
    await expect(ciStatusCard).toContainText(freeRepoName);
    await expect(ciStatusCard).not.toContainText("PR CI");
    await expect(ciStatusCard).not.toContainText("Main CI");
    await expect(ciStatusCard).not.toContainText("task-tracker-repository");
    await expect(ciStatusCard.locator(".status-chip")).not.toHaveText("CI run evidence");
    await expect(securityStatusCard.locator(".overview-status-card__head strong")).toHaveText("Risky operations, approvals, and blockers checked");
    await expect(securityStatusCard).toContainText("Last checked");
    await expect(securityStatusCard).toContainText("Blockers");
    await expect(securityStatusCard).not.toContainText("Dangerous operation approval");
    await expect(securityStatusCard).not.toContainText("Product cleanup");
    await expect(securityStatusCard.locator(".status-chip")).not.toHaveText("Safety checks");
    await expect(page.locator(".overview-status-card__fact")).toHaveCount(0);
    const workflowStatusValueFontSize = await workflowStatusCard.locator(".overview-status-card__head strong").evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize));
    expect(workflowStatusValueFontSize).toBeLessThanOrEqual(20);

    const navigation = page.getByRole("navigation", { name: "Dashboard categories" });
    const repositoryNavigation = page.getByRole("navigation", { name: "Repository" });

    await navigation.getByRole("link", { name: "Lessons", exact: true }).click();
    await expect(page.locator("#lessons")).toContainText("The selected menu is not a lesson.");
    await expect(page.locator("#lessons")).not.toContainText("Lesson Progress");
    await expect(page.locator("#lessons")).not.toContainText("task-tracker-repository");

    await navigation.getByRole("link", { name: "Development Workflow", exact: true }).click();
    await expect(page.locator("#workflow .context-strip")).toContainText(freeRepoName);
    await expect(page.locator("#workflow")).toContainText(/Free development workflow/i);
    const workflowOperationalDetail = page.locator("[data-operational-detail-decisions='workflow']");
    await expect(workflowOperationalDetail).toContainText(freeRepoName);
    await expect(workflowOperationalDetail.locator("[data-operational-detail-fact='git']")).not.toContainText("task-tracker-repository");
    await expect(page.locator("#workflow .mock-table-row--workflow")).toHaveCount(5);
    await expect(page.locator("#workflow .mock-table-row--workflow", { hasText: /Repository observation/i })).toBeVisible();
    await expect(page.locator("#workflow .mock-table-row--workflow", { hasText: /Repository index drift/i })).toBeVisible();
    await expect(page.locator("#workflow")).not.toContainText("task-tracker-repository");
    const workflowHeaderFontSize = await page.locator("#workflow .mock-table__head--workflow").evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize));
    expect(workflowHeaderFontSize).toBeGreaterThanOrEqual(13);
    const workflowTargets = await page.locator("#workflow .mock-table-row--workflow [data-label='Target / branch']").allTextContents();
    expect(workflowTargets).toEqual(Array(5).fill(freeRepoName));

    await repositoryNavigation.getByRole("link", { name: "Repository Info", exact: true }).click();
    await expect(page.locator("#repository-info")).toContainText(freeRepoName);
    const repositoryOperationalDetail = page.locator("[data-operational-detail-decisions='repository-info']");
    await expect(repositoryOperationalDetail).toContainText("Operational detail decisions");
    await expect(repositoryOperationalDetail).toContainText(freeRepoName);
    await expect(page.locator("#repository-info")).toContainText("src");
    await expect(page.locator("#repository-info")).toContainText("ops");
    await expect(page.locator("#repository-file-map")).not.toContainText("App.jsx");
    await expect(page.locator("#repository-file-map")).not.toContainText("REPOSITORY_INDEX.json");
    await page.locator("#repository-file-map").getByRole("button", { name: "Expand all" }).click();
    await expect(page.locator("#repository-file-map")).toContainText("App.jsx");
    await expect(page.locator("#repository-info")).toContainText("REPOSITORY_INDEX.json");
    await expect(page.locator("#repository-info")).toContainText("AGENTS.MD");
    await expect(page.locator("#repository-info")).not.toContainText("task-tracker-repository");

    await repositoryNavigation.getByRole("link", { name: "Documents", exact: true }).click();
    await expect(page.locator("#documents")).toContainText(freeRepoName);
    await expect(page.locator("#documents")).toContainText(/Free development workflow/i);
    await expect(page.locator("#documents")).not.toContainText("task-tracker-repository");

    await page.getByRole("navigation", { name: "Other" }).getByRole("link", { name: "Update History", exact: true }).click();
    await expect(page.locator("#history .mock-table-row--workflow")).toHaveCount(5);
    await expect(page.locator("#history")).not.toContainText("task-tracker-repository");
    const historyTargets = await page.locator("#history .mock-table-row--workflow [data-label='Target / branch']").allTextContents();
    expect(historyTargets).toEqual(Array(5).fill(freeRepoName));
  });

  test("keeps browser-debug-cli as the selected free-development repository across detail pages", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const browserFixture = freeDevelopmentBrowserDebugCliFixture(baseFixture);

    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, browserFixture);
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("browser-debug-cli");
    await expect(page.locator(".context-strip")).not.toContainText("frame-cue");
    await expect(page.locator(".context-strip")).not.toContainText("task-tracker-repository");
    const repositorySelection = page.locator(".repository-selection");
    await expect(repositorySelection).toBeVisible();
    await expect(repositorySelection.locator("[data-repository-option='browser-debug-cli']")).toContainText("Browser Debug CLI");
    await expect(repositorySelection).toContainText("tools/product-repository-registry selected free-development");
    await expect(repositorySelection).not.toContainText("frame-cue");
    await expect(repositorySelection).not.toContainText("/home/");

    await page.getByRole("navigation", { name: "Repository" }).getByRole("link", { name: "Repository Info", exact: true }).click();
    await expect(page.locator("#repository-info")).toContainText("browser-debug-cli");
    await expect(page.locator("#repository-info")).not.toContainText("frame-cue");
    await expect(page.locator("#repository-info")).not.toContainText("task-tracker-repository");

    await page.getByRole("navigation", { name: "Repository" }).getByRole("link", { name: "Documents", exact: true }).click();
    await expect(page.locator("#documents")).toContainText("browser-debug-cli");
    await expect(page.locator("#documents")).not.toContainText("frame-cue");
    await expect(page.locator("#documents")).not.toContainText("task-tracker-repository");

    await page.getByRole("navigation", { name: "Dashboard categories" }).getByRole("link", { name: "Maintenance Sync", exact: true }).click();
    const browserDebugPanel = page.locator("[data-browser-debug-handoff='true']");
    await expect(browserDebugPanel).toBeVisible();
    await expect(browserDebugPanel).toContainText("Browser Debug agent handoff");
    await expect(browserDebugPanel).toContainText("Agent package");
    await expect(browserDebugPanel).toContainText("Command preview");
    await expect(browserDebugPanel).toContainText("node product:bin/browser-debug.js agent package");
    await expect(browserDebugPanel).not.toContainText("/home/");

    await page.getByRole("navigation", { name: "Other" }).getByRole("link", { name: "Update History", exact: true }).click();
    await expect(page.locator("#history .mock-table-row--workflow")).toHaveCount(5);
    const historyTargets = await page.locator("#history .mock-table-row--workflow [data-label='Target / branch']").allTextContents();
    expect(historyTargets).toEqual(Array(5).fill("browser-debug-cli"));
  });

  test("keeps free-development selected while dashboard polling continues", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    const requestedMenus = [];
    await page.unroute(dashboardDataRoutePattern);
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      requestedMenus.push(menuId || "default");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(menuId === "free-development" ? freeDevelopmentFixture : baseFixture),
      });
    });

    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=150");
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await page.locator(".menu-tile[data-menu-tile='free-development']").click();
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");

    await page.waitForTimeout(1400);
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("frame-cue");
    await expect(page.locator(".context-strip")).not.toContainText("task-tracker-repository");
    expect(requestedMenus.filter((menuId) => menuId === "free-development")).toHaveLength(1);
    expect(requestedMenus.at(-1)).toBe("default");
    await expect(page.locator(".sync-banner")).toHaveCount(0);
  });

  test("updates free-development overview cards from live status without waiting for a full snapshot", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, freeDevelopmentFixture);
    await page.unroute(dashboardLiveStatusRoutePattern);
    await routeDashboardLiveStatus(
      page,
      dashboardLiveStatusFixture({
        menuId: "free-development",
        workflowContext: "free-development",
        repoName: "frame-cue",
        generatedAt: "2026-06-05T00:04:20Z",
        localTestsStatus: "passed",
        localTestsObservedAt: "2026-06-05T00:04:00Z",
        localTestsDetailCode: "local_tests_checked",
        localTestBlockerCount: 0,
        localTestItems: [
          {
            source_id: "product.tests.unit",
            category: "behavior",
            kind: "unit_test",
            status: "passed",
            observed_at: "2026-06-05T00:03:50Z",
            next_command: "npm test",
          },
          {
            source_id: "product.tests.smoke",
            category: "behavior",
            kind: "smoke_test",
            status: "passed",
            observed_at: "2026-06-05T00:03:58Z",
            next_command: "npm test",
          },
          {
            source_id: "product.structure.files",
            category: "structure",
            kind: "file_check",
            status: "passed",
            observed_at: "2026-06-05T00:03:59Z",
            next_command: "./tools/check-framecue",
          },
          {
            source_id: "product.structure.settings",
            category: "structure",
            kind: "settings_check",
            status: "passed",
            observed_at: "2026-06-05T00:04:00Z",
            next_command: "./tools/check-framecue",
          },
          {
            source_id: "product.structure.scripts",
            category: "structure",
            kind: "script_check",
            status: "passed",
            observed_at: "2026-06-05T00:04:00Z",
            next_command: "./tools/check-framecue",
          },
        ],
        gitStatus: "failed",
        gitDetailCode: "git_uncommitted_changes",
        dirtyCount: 3,
        ciStatus: "manual_required",
        ciDetailCode: "ci_running",
        ciObservedAt: "2026-06-05T00:04:10Z",
        workflowName: "Product CI",
        runStatus: "in_progress",
        securityStatus: "not_run",
        securityBlockerCount: 3,
      }),
    );

    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    const localCheckSummary = page.locator("[data-overview-status-card='workflow'] .decision-progress-summary");
    await expect(localCheckSummary.locator(".decision-progress-summary__row")).toHaveText(["Structure check 3/3"]);
    await expect(localCheckSummary.locator(".decision-progress-summary__count")).toHaveText(["3/3"]);
    const localCheckCountWeight = await localCheckSummary.locator(".decision-progress-summary__count").first().evaluate((element) => {
      const weight = window.getComputedStyle(element).fontWeight;
      return Number.parseInt(weight, 10) || (weight === "bold" ? 700 : 0);
    });
    expect(localCheckCountWeight).toBeGreaterThanOrEqual(700);
    await expect(page.locator("[data-overview-status-card='git'] .overview-status-card__head strong")).toHaveText("Uncommitted changes 3");
    await expect(page.locator("[data-overview-status-card='git']")).toContainText("Branch: main");
    await expect(page.locator("[data-overview-status-card='ci'] .overview-status-card__head strong")).toHaveText("CI is running");
    await expect(page.locator("[data-overview-status-card='ci']")).toContainText("Workflow: Product CI");
    await expect(page.locator("[data-overview-status-card='security'] .overview-status-card__head strong")).toHaveText("Unresolved safety blockers checked 3");
    const situationBoard = page.locator("[data-operational-situation='true']");
    await expect(situationBoard).toContainText("Live observation");
    await expect(situationBoard.locator("[data-operational-situation-fact='current-work']")).toContainText("Free Development");
    await expect(situationBoard.locator("[data-operational-situation-fact='blockers']")).toContainText("6 blocker(s)");
    await expect(situationBoard.locator("[data-operational-situation-fact='git']")).toContainText("Uncommitted or untracked changes 3");
    await expect(situationBoard.locator("[data-operational-situation-fact='git']")).toContainText("Branch: main");
    await expect(situationBoard.locator("[data-operational-situation-fact='tests-ci']")).toContainText("CI");
    await expect(situationBoard.locator("[data-operational-situation-fact='next-safe']")).toContainText("./tools/product-repository-authority status --json");

    const localTestsCard = page.locator("[data-overview-status-card='workflow']");
    const gitCard = page.locator("[data-overview-status-card='git']");
    const ciCard = page.locator("[data-overview-status-card='ci']");
    const securityCard = page.locator("[data-overview-status-card='security']");
    await expect(localTestsCard).toHaveAttribute("data-evidence-source-id", "product.gates.tests");
    await expect(localTestsCard).toHaveAttribute("data-evidence-current-item-id", "product.tests.unit");
    await expect(gitCard).toHaveAttribute("data-evidence-source-id", "product_git_sync_live");
    await expect(gitCard).toHaveAttribute("data-evidence-current-item-id", "product.git.worktree");
    await expect(ciCard).toHaveAttribute("data-evidence-source-id", "product_ci_live");
    await expect(ciCard).toHaveAttribute("data-evidence-current-item-id", "product_ci_live");
    await expect(securityCard).toHaveAttribute("data-evidence-source-id", "product.security.local_artifacts");
    await expect(securityCard).toHaveAttribute("data-evidence-current-item-id", "product.security.local_artifacts");

    await localTestsCard.getByRole("button", { name: "Details" }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Unit test: product.tests.unit");
    await page.locator(".insight-detail-modal__close").click();

    const navigation = page.getByRole("navigation", { name: "Dashboard categories" });
    await navigation.getByRole("link", { name: "Development Workflow", exact: true }).click();
    const workflowOperationalDetail = page.locator("[data-operational-detail-decisions='workflow']");
    await expect(workflowOperationalDetail.locator("[data-operational-detail-fact='git']")).toContainText("Uncommitted or untracked changes 3");
    await expect(workflowOperationalDetail.locator("[data-operational-detail-evidence-key='local_tests'][data-evidence-source-id='product.tests.unit']")).toBeVisible();
    await expect(workflowOperationalDetail.locator("[data-operational-detail-evidence-key='git_sync'][data-evidence-source-id='product.git.worktree']")).toBeVisible();
    await expect(workflowOperationalDetail.locator("[data-operational-detail-evidence-key='ci'][data-evidence-source-id='product_ci_live']")).toBeVisible();
    await expect(page.locator("#workflow .mock-table-row--live-evidence[data-evidence-source-id='product.tests.unit']")).toBeVisible();
    await expect(page.locator("#workflow .mock-table-row--live-evidence[data-evidence-source-id='product.git.worktree']")).toBeVisible();
    await expect(page.locator("#workflow .mock-table-row--live-evidence[data-evidence-source-id='product_ci_live']")).toBeVisible();
    await page.locator("#workflow .mock-table-row--live-evidence[data-evidence-source-id='product.tests.unit']").getByRole("button", { name: "View details" }).click();
    await expect(page.locator(".insight-detail-modal")).toContainText("Unit test: product.tests.unit");
    await page.locator(".insight-detail-modal__close").click();

    await navigation.getByRole("link", { name: "Safety Actions", exact: true }).click();
    const safetyOperationalDetail = page.locator("[data-operational-detail-decisions='safety']");
    await expect(safetyOperationalDetail.locator("[data-operational-detail-evidence-key='security'][data-evidence-source-id='product.security.local_artifacts']")).toBeVisible();
    await expect(page.locator("#safety .mock-table-row--live-evidence[data-evidence-source-id='product.security.local_artifacts']")).toBeVisible();
  });

  test("labels operational situation as saved snapshot fallback when live status is unavailable", async ({ page }) => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    addProducerDecisionPages(fixture);
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, fixture);
    await page.unroute(dashboardLiveStatusRoutePattern);
    await page.route(dashboardLiveStatusRoutePattern, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "live status unavailable" }),
      });
    });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");

    const situationBoard = page.locator("[data-operational-situation='true']");
    await expect(situationBoard).toContainText("Saved snapshot fallback");
    await expect(situationBoard).not.toContainText("Live observation");

    const navigation = page.getByRole("navigation", { name: "Dashboard categories" });
    await navigation.getByRole("link", { name: "Development Workflow", exact: true }).click();
    await expect(page.locator("[data-operational-detail-decisions='workflow']")).toContainText("Saved snapshot fallback");
  });

  test("does not render stale evidence-backed detail pages while selected menu snapshot is unavailable", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    await page.unroute(dashboardDataRoutePattern);
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.searchParams.get("menu_id") === "free-development") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "free-development refresh unavailable" }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(baseFixture),
      });
    });
    await page.unroute(dashboardLiveStatusRoutePattern);
    await routeDashboardLiveStatus(
      page,
      dashboardLiveStatusFixture({
        menuId: "free-development",
        workflowContext: "free-development",
        repoName: "frame-cue",
      }),
    );
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, "free-development");
    }, "dashboard-control-center.activeMenuId");

    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000&context_switch_fallback_ms=500#workflow");

    await expect(page.locator(".context-switch-holding")).toBeVisible();
    await expect(page.locator(".mock-table-row--workflow")).toHaveCount(0);
    await expect(page.locator(".context-switch-holding")).toContainText("Free Development");
    await expect(page.locator("main")).not.toContainText("Git sync evidence");
    await expect(page.locator("main")).not.toContainText("task-tracker-repository");
  });

  test("refresh button keeps free-development on the saved dashboard snapshot path", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    const requestedMenus = [];
    await page.unroute(dashboardDataRoutePattern);
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      requestedMenus.push(menuId || "default");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(menuId === "free-development" ? freeDevelopmentFixture : baseFixture),
      });
    });

    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");
    await page.locator(".menu-tile[data-menu-tile='free-development']").click();
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("frame-cue");

    const requestCountBeforeRefresh = requestedMenus.length;
    await page.getByRole("button", { name: /Refresh/ }).first().click();
    await expect.poll(() => requestedMenus.length).toBe(requestCountBeforeRefresh + 1);
    expect(requestedMenus.at(-1)).toBe("default");
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("frame-cue");
    await expect(page.locator(".sync-banner")).toHaveCount(0);
  });

  test("shows saved dashboard immediately while stored free-development context refreshes", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    await page.unroute(dashboardDataRoutePattern);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, "free-development");
    }, "dashboard-control-center.activeMenuId");
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      if (menuId === "free-development") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(freeDevelopmentFixture),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(baseFixture),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");
    await expect(page.getByText("Loading dashboard data.")).toHaveCount(0);
    const progress = page.locator(".context-switch-progress");
    await expect(progress).toHaveCount(0);
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("frame-cue");
  });

  test("clears saved menu progress when stored free-development refresh fails", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    await page.unroute(dashboardDataRoutePattern);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, "free-development");
    }, "dashboard-control-center.activeMenuId");
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      if (menuId === "free-development") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "free-development refresh failed" }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(baseFixture),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000&context_switch_fallback_ms=500");
    await expect(page.getByText("Loading dashboard data.")).toHaveCount(0);
    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development");
    await expect(page.locator(".context-strip")).toContainText("frame-cue");
    await expect(page.locator(".context-switch-progress")).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator(".context-switch-failure")).toHaveCount(0);
    await expect(page.locator(".sync-banner")).toHaveCount(0);
  });

  test("loads saved practical lesson from cached dashboard without live menu generation", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const requestedMenus = [];
    await page.unroute(dashboardDataRoutePattern);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, "step_1_14");
    }, "dashboard-control-center.activeMenuId");
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      requestedMenus.push(menuId || "default");
      if (menuId === "step_1_14") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "step_1_14 live refresh should not block initial display" }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(baseFixture),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000&context_switch_fallback_ms=500");
    await expect(page.getByText("Loading dashboard data.")).toHaveCount(0);
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*Practical lesson/);
    await expect(page.locator(".context-strip")).toContainText("task-tracker-repository");
    await expect(page.locator(".context-switch-progress")).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator(".context-switch-failure")).toHaveCount(0);
    expect(requestedMenus).toEqual(["default"]);
  });

  test("switches to saved free-development context when live refresh is slow", async ({ page }) => {
    const baseFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const freeDevelopmentFixture = freeDevelopmentFrameCueFixture(baseFixture);
    baseFixture.contexts_by_menu["free-development"] = JSON.parse(JSON.stringify(freeDevelopmentFixture.contexts_by_menu["free-development"]));
    Object.assign(
      baseFixture.available_contexts.find((context) => context.menu_id === "free-development"),
      freeDevelopmentFixture.available_contexts.find((context) => context.menu_id === "free-development"),
    );
    await page.unroute(dashboardDataRoutePattern);
    await page.route(dashboardDataRoutePattern, async (route) => {
      const requestUrl = new URL(route.request().url());
      const menuId = requestUrl.searchParams.get("menu_id") || "";
      if (menuId === "free-development") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(freeDevelopmentFixture),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(baseFixture),
      });
    });

    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000&context_switch_fallback_ms=500");
    await page.locator(".menu-tile[data-menu-tile='free-development']").click();
    const progress = page.locator(".context-switch-progress");
    await expect(progress).toBeVisible();
    await expect(progress.locator(".context-switch-progress__step--complete")).toContainText("Selection accepted");
    await expect(progress.locator(".context-switch-progress__step--active")).toContainText("Refreshing repository snapshot");
    await expect(progress).toContainText("Free Development");

    await expect(page.locator(".menu-tile.is-selected")).toContainText("Free Development", { timeout: 1200 });
    await expect(page.locator(".context-strip")).toContainText("frame-cue");
    await expect(progress).toHaveCount(0);
  });

  test("shows structured policy feedback when apply returns blocked", async ({ page }) => {
    const settingsCalls = [];
    await routeSettingsApi(page, settingsCalls, { blockedApplySettingId: "learning_mode" });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    const settingsView = page.locator("#settings");
    const learningModeRow = settingsView.locator(".settings-row", { hasText: "Learning mode" });
    await learningModeRow.click();
    await page.locator(".settings-value-select select").selectOption("B");
    await page.getByRole("button", { name: /Review change/ }).click();
    await expect(page.locator(".settings-result")).toContainText("Plan ready");
    await page.getByLabel("I confirm this settings update.").check();
    await page.getByRole("button", { name: /Apply setting/ }).click();

    const feedback = page.locator(".settings-apply-feedback");
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute("data-settings-apply-feedback-status", "blocked");
    await expect(feedback).toContainText("No approved write path");
    await expect(feedback).toContainText("Enable branch work");
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
  });

  test("applies the workflow display language to the fixed UI without reloading", async ({ page }) => {
    const methods = [];
    const settingsCalls = [];
    const jaSnapshot = dashboardLocaleFixture("ja", "ja", "b");
    const enSnapshot = dashboardLocaleFixture("en", "en", "c");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [jaSnapshot, enSnapshot], methods);
    await routeSettingsApi(page, settingsCalls);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    await expect(page.getByRole("navigation", { name: "ダッシュボードカテゴリ" })).toBeVisible();
    await expect(page.locator("#settings-heading")).toHaveText("設定");
    await page.evaluate(() => {
      window.__dashboardReloadMarker = "kept";
    });

    const settingsView = page.locator("#settings");
    await settingsView.locator(".settings-row[data-settings-row-id='workflow_language']").click();
    await expect(page.locator(".settings-modal")).toBeVisible();
    await page.locator(".settings-value-select select").selectOption("en");
    await page.getByRole("button", { name: /変更を確認/ }).click();
    await expect(page.locator(".settings-result")).toContainText("確認済み");
    await page.getByLabel("この設定更新を確認しました。").check();
    await page.getByRole("button", { name: /設定を適用/ }).click();

    await expect(page.getByRole("navigation", { name: "Dashboard categories" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Repository" }).getByRole("link", { name: /Settings/ })).toBeVisible();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(page.locator(".settings-apply-feedback")).toHaveCount(0);
    await expect(settingsView.locator(".settings-row[data-settings-row-id='workflow_language']")).toContainText("English");
    await expect.poll(() => page.evaluate(() => window.__dashboardReloadMarker)).toBe("kept");
    expect(methods).toEqual(["GET", "GET"]);
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
    expect(settingsCalls[1].payload).toMatchObject({ setting_id: "workflow_language", value: "en", menu_id: "step_1_14", confirm: true });
  });

  test("shows applying feedback and switches workflow language while slow apply is running", async ({ page }) => {
    const methods = [];
    const settingsCalls = [];
    const jaSnapshot = dashboardLocaleFixture("ja", "ja", "1");
    const enSnapshot = dashboardLocaleFixture("en", "en", "2");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [jaSnapshot, enSnapshot], methods);
    await routeSettingsApi(page, settingsCalls, { applyDelayMs: 1200 });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    await expect(page.getByRole("navigation", { name: "ダッシュボードカテゴリ" })).toBeVisible();
    const settingsView = page.locator("#settings");
    await settingsView.locator(".settings-row[data-settings-row-id='workflow_language']").click();
    await page.locator(".settings-value-select select").selectOption("en");
    await page.getByRole("button", { name: /変更を確認/ }).click();
    await page.getByLabel("この設定更新を確認しました。").check();
    await page.getByRole("button", { name: /設定を適用/ }).click();

    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Dashboard categories" })).toBeVisible();
    const feedback = page.locator(".settings-apply-feedback");
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute("data-settings-apply-feedback-status", "applying");
    await expect(feedback).toContainText("Applying setting");
    expect(methods).toEqual(["GET"]);
    await expect(feedback).toHaveCount(0, { timeout: 5000 });
    await expect(settingsView.locator(".settings-row[data-settings-row-id='workflow_language']")).toContainText("English");
    expect(methods).toEqual(["GET", "GET"]);
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
  });

  test("shows delayed apply feedback until workflow language snapshot reconciles", async ({ page }) => {
    const methods = [];
    const settingsCalls = [];
    const jaSnapshot = dashboardLocaleFixture("ja", "ja", "7");
    const enSnapshot = dashboardLocaleFixture("en", "en", "8");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataWithDelays(page, [jaSnapshot, enSnapshot], methods, [0, 1200]);
    await routeSettingsApi(page, settingsCalls);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    const settingsView = page.locator("#settings");
    await settingsView.locator(".settings-row[data-settings-row-id='workflow_language']").click();
    await page.locator(".settings-value-select select").selectOption("en");
    await page.getByRole("button", { name: /変更を確認/ }).click();
    await page.getByLabel("この設定更新を確認しました。").check();
    await page.getByRole("button", { name: /設定を適用/ }).click();

    const feedback = page.locator(".settings-apply-feedback");
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute("data-settings-apply-feedback-status", "reconciling");
    await expect(feedback).toContainText("Updating display");
    await expect(settingsView.locator(".settings-row[data-settings-row-id='workflow_language']")).toContainText("English");
    await expect(feedback).toHaveCount(0, { timeout: 4000 });
    expect(methods).toEqual(["GET", "GET"]);
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
  });

  test("keeps optimistic chrome while stale snapshot remains authoritative for setting values", async ({ page }) => {
    const methods = [];
    const settingsCalls = [];
    const jaSnapshot = dashboardLocaleFixture("ja", "ja", "9");
    const staleJaSnapshot = dashboardLocaleFixture("ja", "ja", "a");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [jaSnapshot, staleJaSnapshot], methods);
    await routeSettingsApi(page, settingsCalls);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    const settingsView = page.locator("#settings");
    await settingsView.locator(".settings-row[data-settings-row-id='workflow_language']").click();
    await page.locator(".settings-value-select select").selectOption("en");
    await page.getByRole("button", { name: /変更を確認/ }).click();
    await page.getByLabel("この設定更新を確認しました。").check();
    await page.getByRole("button", { name: /設定を適用/ }).click();

    const feedback = page.locator(".settings-apply-feedback");
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute("data-settings-apply-feedback-status", "stale_snapshot");
    await expect(page.getByRole("navigation", { name: "Dashboard categories" })).toBeVisible();
    await expect(settingsView.locator(".settings-row[data-settings-row-id='workflow_language']")).toContainText("Japanese");
    expect(methods).toEqual(["GET", "GET"]);
    expect(settingsCalls[1].payload).toMatchObject({ setting_id: "workflow_language", value: "en", menu_id: "step_1_14", confirm: true });
  });

  test("applies Arabic RTL locale metadata after settings success", async ({ page }) => {
    const methods = [];
    const settingsCalls = [];
    const enSnapshot = dashboardLocaleFixture("en", "en", "d");
    const arSnapshot = dashboardLocaleFixture("ar", "ar", "e");
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [enSnapshot, arSnapshot], methods);
    await routeSettingsApi(page, settingsCalls);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000#settings");
    await expect(page.locator(".app-shell")).toHaveAttribute("dir", "ltr");
    await page.evaluate(() => {
      window.__dashboardReloadMarker = "kept";
    });

    const settingsView = page.locator("#settings");
    await settingsView.locator(".settings-row[data-settings-row-id='workflow_language']").click();
    await page.locator(".settings-value-select select").selectOption("ar");
    await page.getByRole("button", { name: /Review change/ }).click();
    await page.getByLabel("I confirm this settings update.").check();
    await page.getByRole("button", { name: /Apply setting/ }).click();

    await expect(page.locator(".app-shell")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".category-nav__link[href='#settings']")).toContainText("الإعدادات");
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(page.locator(".settings-apply-feedback")).toHaveCount(0);
    await expect(settingsView.locator(".settings-row[data-settings-row-id='workflow_language']")).toContainText("العربية");
    await expect.poll(() => page.evaluate(() => window.__dashboardReloadMarker)).toBe("kept");
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
    expect(methods).toEqual(["GET", "GET"]);
    expect(settingsCalls[1].payload).toMatchObject({ setting_id: "workflow_language", value: "ar", menu_id: "step_1_14", confirm: true });
  });

  test("renders representative non-English locale chrome without per-language browser loops", async ({ page }) => {
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, dashboardLocaleFixture("zh-CN", "zh-CN", "f"));
    await page.goto("http://lesson.local/dashboard-control-center/index.html#settings");
    await expect(page.locator(".app-shell")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#settings-heading")).toHaveText("设置");
    await expect(page.locator(".category-nav__link[href='#documents']")).toContainText("文档");
    let hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);

    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, dashboardLocaleFixture("de", "de", "a"));
    await page.reload();
    await expect(page.locator("#settings-heading")).toHaveText("Einstellungen");
    await expect(page.locator(".category-nav__link[href='#workflow']")).toContainText("Entwicklungsworkflow");
    hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("keeps unsafe text as data across desktop and mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html");
    await expect(page.getByRole("heading", { name: "Explore Pages" })).toBeVisible();
    const hasMidWidthOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasMidWidthOverflow).toBe(false);

    await page.setViewportSize({ width: 390, height: 920 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html");

    await expect(page.locator(".menu-tile")).toHaveCount(7);
    await expect(page.locator(".overview-status-card")).toHaveCount(4);
    await expect(page.locator(".explore-card")).toHaveCount(4);
    const hasHorizontalOverflow = await page.locator(".app-shell").evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);

    for (const target of ["Lessons", "Development Workflow", "Maintenance Sync", "Safety Actions"]) {
      await openMobileNavLink(page, target);
      await expect(page.getByLabel("Detail page decision summary")).toBeVisible();
      const hasDetailOverflow = await page.locator(".app-shell").evaluate((element) => element.scrollWidth > element.clientWidth);
      expect(hasDetailOverflow).toBe(false);
    }
    await page.getByRole("button", { name: /^(Menu|メニュー)$/ }).click();
    await page.getByRole("navigation", { name: "Repository" }).getByRole("link", { name: /Settings/ }).click();
    await expect(page.getByLabel("Detail page decision summary")).toBeVisible();
    const hasSettingsOverflow = await page.locator(".app-shell").evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(hasSettingsOverflow).toBe(false);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("navigation", { name: "Dashboard categories" }).getByRole("link", { name: /Maintenance Sync/ }).click();
    await expect(page.getByText("Technical sources used for the saved snapshot")).toBeVisible();
    await expect(page.getByText("[redacted secret-like data]", { exact: false })).toHaveCount(0);
    await expect(page.getByText("TOKEN=abcdefghijklmnop", { exact: false })).toHaveCount(0);
  });

  test("updates changed dashboard data without reloading the page", async ({ page }) => {
    const methods = [];
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [fixturePath, liveUpdateFixturePath], methods);

    await page.setViewportSize({ width: 1440, height: 980 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=100");
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await page.evaluate(() => {
      window.__dashboardReloadMarker = "kept";
    });

    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Ready");
    await expect(page.locator(".common-status-card--security")).toContainText("None");
    await expect(page.locator(".explore-card", { hasText: "Lessons" })).toContainText("Open");
    await expect.poll(() => page.evaluate(() => window.__dashboardReloadMarker)).toBe("kept");
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test("keeps last known good data when a refresh fails validation", async ({ page }) => {
    const methods = [];
    const invalidDocuments = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    invalidDocuments.documents.catalog[0].path = "/tmp/unsafe-document.md";
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, [fixturePath, invalidDocuments, invalidFixturePath, liveUpdateFixturePath], methods);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=100");
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Ready");
    expect(methods.every((method) => method === "GET")).toBe(true);
    expect(methods.length).toBeGreaterThanOrEqual(4);
  });

  test("shows an incomplete Documents state for legacy snapshots without a documents catalog", async ({ page }) => {
    const legacySnapshot = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    delete legacySnapshot.documents;

    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, legacySnapshot);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#documents");

    const documentsView = page.locator("#documents");
    await expect(documentsView).toBeVisible();
    await expect(page.getByText("Dashboard Data Unavailable")).toHaveCount(0);
    await expect(documentsView.locator("#documents-brief .sidebar-page-card")).toHaveCount(1);
    await expect(documentsView.locator("#documents-related .sidebar-page-link-card")).toHaveCount(0);
  });

  test("shows an incomplete Settings state for legacy snapshots and rejects malformed settings catalogs", async ({ page }) => {
    const legacySnapshot = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    delete legacySnapshot.settings;

    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardData(page, legacySnapshot);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#settings");

    const settingsView = page.locator("#settings");
    await expect(settingsView).toBeVisible();
    await expect(page.getByText("Dashboard Data Unavailable")).toHaveCount(0);
    await expect(settingsView.locator("#settings-unavailable .sidebar-page-card")).toHaveCount(1);

    const invalidSettings = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    invalidSettings.settings.items[0].source_file = "/tmp/unsafe-settings.tsv";
    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, invalidSettings);
    await page.goto("http://lesson.local/dashboard-control-center/index.html?invalid_settings=1#settings");
    await expect(page.getByText("Dashboard Data Unavailable")).toBeVisible();
  });

  test("does not duplicate ready workflow items in the must-review section", async ({ page }) => {
    const readyWorkflow = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    readyWorkflow.selected_context = {
      ...readyWorkflow.selected_context,
      git_status: "ready",
      ci_status: "ready",
      security_status: "ready",
      evidence_status: "ready",
      blockers: [],
    };
    readyWorkflow.contexts_by_menu = {
      ...readyWorkflow.contexts_by_menu,
      [readyWorkflow.selected_context.menu_id]: readyWorkflow.selected_context,
    };
    readyWorkflow.partial_failures = [];
    readyWorkflow.summary.category_metrics.workflow = {
      ...readyWorkflow.summary.category_metrics.workflow,
      healthy: 8,
      warning: 0,
      problem: 0,
      percent: 100,
      status: "ready",
    };
    readyWorkflow.development = {
      ...readyWorkflow.development,
      product_repository: { status: "ready", configured_name: "example-product" },
      product_authority: {
        ...readyWorkflow.development.product_authority,
        status: "ready",
        evidence_summary: {
          ...readyWorkflow.development.product_authority.evidence_summary,
          index_status: "ready",
          items: readyWorkflow.development.product_authority.evidence_summary.items.map((item) => ({
            ...item,
            status: "passed",
            freshness_state: "current",
            authority: "authoritative",
          })),
        },
        product_operation_blockers: [],
      },
      documents: { status: "ready" },
      git_sync_status: "ready",
      ci_status: "ready",
    };
    readyWorkflow.git_workflow = {
      policy_status: "ready",
      settings_status: "ready",
      gate_status: "ready",
      approval_status: "ready",
    };

    await page.unroute(dashboardDataRoutePattern);
    await routeDashboardDataPayload(page, readyWorkflow);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#workflow");

    await expect(page.locator(".decision-summary--workflow")).toContainText("Ready");
    await expect(page.locator(".workflow-mini-card")).toHaveCount(5);
    await expect(page.locator(".mock-table-row--workflow")).toHaveCount(5);
  });
});

test.describe("Japanese dashboard control center", () => {
  test.use({ locale: "ja-JP" });

  test("uses device language for fixed UI labels while preserving producer data text", async ({ page }) => {
    await page.goto("http://lesson.local/dashboard-control-center/index.html");
    const navigation = page.getByRole("navigation", { name: "ダッシュボードカテゴリ" });

    await expect(navigation.getByRole("link", { name: /ダッシュボード/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /レッスン/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /開発ワークフロー/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /保守・同期/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /安全確認/ })).toBeVisible();
    await expect(page.getByText("Settings と Design Studio の許可済み操作以外は読み取り専用です。")).toBeVisible();
    await expect(page.getByText("カテゴリ別の状態")).toHaveCount(0);
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*実践レッスン/);
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("ブロッカー: 1");
    await expect(page.locator(".common-status-card--security")).toContainText("Security確認");
    await expect(page.locator(".common-status-card--git .common-status-op")).toHaveCount(4);
    await expect(page.locator(".common-status-card--git .common-status-op", { hasText: "Merge" })).toContainText("許可");

    await navigation.getByRole("link", { name: /レッスン/ }).click();
    await expect(page.getByLabel("詳細ページ判断サマリー")).toBeVisible();
    await expect(page.getByText("このページで確認すること")).toBeVisible();
    await expect(page.getByRole("heading", { name: "STEP 1-7 基礎レッスン" })).toBeVisible();
    await expect(page.locator(".lesson-progress-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "応用レッスン" })).toBeVisible();

    await navigation.getByRole("link", { name: /開発ワークフロー/ }).click();
    await expect(page.getByLabel("詳細ページ判断サマリー")).toBeVisible();
    await expect(page.locator(".workflow-mini-card")).toHaveCount(5);
    await expect(page.locator(".operation-chip", { hasText: "Merge" })).toContainText("許可");
    await expect(page.getByRole("heading", { name: "Product Evidence" })).toBeVisible();
    await expect(page.getByText(/Development\.Product Repository/)).toHaveCount(0);

    await page.getByRole("navigation", { name: "リポジトリ" }).getByRole("link", { name: /ドキュメント/ }).click();
    const documentsView = page.locator("#documents");
    await expect(documentsView).toBeVisible();
    await expect(documentsView.locator("#documents-brief")).toBeVisible();
    await expect(documentsView.locator(".documents-brief-card")).toHaveCount(5);
    await expect(documentsView.locator(".documents-brief-card", { hasText: "作る成果物を判断する" })).toContainText("要件");
    await expect(documentsView.locator(".documents-brief-card", { hasText: "現在の進捗を判断する" })).toContainText("タスクトラッカー");
    await documentsView.locator(".documents-brief-card", { hasText: "作る成果物を判断する" }).click();
    await expect(page.locator(".documents-brief-modal")).toBeVisible();
    await expect(page.locator(".documents-brief-modal")).toContainText("元文書");
    await expect(page.locator(".documents-brief-modal")).toContainText("文書から今わかること");
    await page.locator(".documents-brief-modal__close").click();
    await expect(documentsView.locator("#documents-next-actions .documents-next-row")).toHaveCount(3);
    await expect(documentsView.locator("#documents-related .sidebar-page-link-card")).toHaveCount(3);
    await expect(page.locator(".evidence-row")).toHaveCount(0);

    await navigation.getByRole("link", { name: /保守・同期/ }).click();
    await expect(page.getByRole("heading", { name: "同期と確認記録" })).toBeVisible();
    await expect(page.locator(".evidence-row")).toHaveCount(6);
    await expect(page.getByText("実行証跡", { exact: true })).toBeVisible();
    await expect(page.getByText("product_ci_live")).toHaveCount(0);

    await navigation.getByRole("link", { name: /安全確認/ }).click();
    await expect(page.getByLabel("詳細ページ判断サマリー")).toBeVisible();
    await expect(page.getByRole("heading", { name: "コマンドプレビュー（表示専用）" })).toBeVisible();
    await expect(page.locator(".display-only-badge").first()).toContainText("表示専用");
    await expect(page.locator(".command-preview")).toHaveCount(4);
    await expect(page.locator(".command-preview .command-chip")).toHaveCount(4);
  });
});
