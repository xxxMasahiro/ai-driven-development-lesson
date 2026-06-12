const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fixturePath = path.join(root, "tests/fixtures/dashboard-control-center.json");
const liveUpdateFixturePath = path.join(root, "tests/fixtures/dashboard-control-center-live-update.json");
const invalidFixturePath = path.join(root, "tests/fixtures/dashboard-control-center-invalid.json");
const buildRoot = path.join(root, "dist/dashboard-control-center");
const fixtureSettingsCount = JSON.parse(fs.readFileSync(fixturePath, "utf8")).settings.items.length;

test.beforeAll(() => {
  const indexPath = path.join(buildRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("dashboard control-center build output is missing; run npm run dashboard:build before Playwright");
  }
});

async function routeDashboardData(page, fixtures, methods = []) {
  const fixtureList = Array.isArray(fixtures) ? fixtures : [fixtures];
  let requestCount = 0;
  await page.route("**/dashboard-data.json", async (route) => {
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
  await page.route("**/dashboard-data.json", async (route) => {
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
  await page.route("**/dashboard-data.json", async (route) => {
    methods.push(route.request().method());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

async function routeSettingsApi(page, calls = [], options = {}) {
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
    const delayMs = command === "apply" ? Number(options.applyDelayMs || 0) : Number(options.planDelayMs || 0);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const value = String(payload.value || "");
    const settingId = String(payload.setting_id || "");
    const isWorkflowLanguage = settingId === "workflow_language";
    const isProductLanguage = settingId === "product_language";
    const previousValue = isWorkflowLanguage ? (value === "ar" ? "en" : "ja") : settingId === "learning_mode" ? "A" : value;
    const targetFile = isWorkflowLanguage
      ? "learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
      : isProductLanguage
        ? "learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
        : settingId.startsWith("git_")
          ? "learning/GIT_WORKFLOW_SETTINGS.tsv"
          : "learning/LESSON_MODE_14_DAYS.tsv";
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
        setting_kind: settingId.startsWith("git_") ? "git" : "lesson",
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
  item.current_label = settingId === "learning_mode" ? `${value}: Detailed guidance` : String(value);
  return data;
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
});

test.describe("English dashboard control center", () => {
  test.use({ locale: "en-US" });

  test("renders the mock-source overview and detail surfaces from producer data", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    await page.goto("http://lesson.local/dashboard-control-center/index.html?refresh_ms=60000");
    const navigation = page.getByRole("navigation", { name: "Dashboard categories" });
    const repositoryNavigation = page.getByRole("navigation", { name: "Repository" });

    await expect(page.locator(".brand strong", { hasText: "Repository Control Center" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Lessons/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Development Workflow/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Maintenance Sync/ })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Safety Actions/ })).toBeVisible();
    await expect(repositoryNavigation.locator(".category-nav__link")).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "Other" }).locator(".category-nav__link")).toHaveCount(2);
    await expect(page.getByText("Read-only outside Settings.")).toBeVisible();

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
    await expect(page.locator("[data-overview-status-card='git']")).toContainText("Unconfirmed");
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("Blockers: 1");
    await expect(page.locator(".common-status-card--git .common-status-op")).toHaveCount(4);
    await expectCenteredSvg(page.locator(".common-status-card--git .common-status-op__label"));
    await expect(page.locator(".common-status-card--security")).toContainText("Failures / blockers");
    await expect(page.locator(".common-status-card--security")).toContainText("1");
    await expectCenteredSvg(page.locator(".common-status-card--security .common-status-card__icon"));
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
    await expect(page.getByLabel("Detail page decision summary")).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    await expect(page.locator(".context-strip")).toContainText(/Step\s*12\s*\/\s*14/);
    await expect(page.locator(".context-strip--lessons .mini-progress-ring--icon")).toHaveCount(1);
    await expect(page.getByText("What this page checks")).toBeVisible();
    await expect(page.getByText("Current judgment")).toBeVisible();
    await expect(page.getByText("Must review")).toBeVisible();
    await expect(page.getByText("Next safe check")).toBeVisible();
    await expect(page.locator(".decision-summary--lessons")).toContainText(/Check\s*Git\/CI status on the workflow page/);
    await expect(page.getByRole("heading", { name: "STEP 1-7 Basic Lesson" })).toBeVisible();
    await expect(page.locator(".lesson-progress-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Applied Lesson" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live status (current execution state)" })).toBeVisible();

    await navigation.getByRole("link", { name: /Development Workflow/ }).click();
    await expect(page.getByRole("heading", { name: "Development Workflow" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    await expect(page.locator(".operation-chip")).toHaveCount(6);
    await expect(page.locator(".workflow-mini-card")).toHaveCount(5);
    await expectCenteredSvg(page.locator(".workflow-mini-card__icon"));
    await expect(page.getByRole("heading", { name: "Git Sync" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Product Evidence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent workflow execution" })).toBeVisible();
    await expect(page.getByText(/Development\.Product Repository/)).toHaveCount(0);
    await expect(page.getByText("development.git.sync.status")).toHaveCount(0);
    await expect(page.locator(".mock-table-row--workflow")).toHaveCount(5);

    await navigation.getByRole("link", { name: /Maintenance Sync/ }).click();
    await expect(page.getByRole("heading", { name: "Maintenance Sync" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    await expectCenteredSvg(page.locator(".maintenance-mini-card__icon"));
    await expect(page.locator(".maintenance-mini-card")).toHaveCount(6);
    await expect(page.locator(".evidence-row")).toHaveCount(6);
    await expect(page.locator(".evidence-row", { hasText: "Execution evidence" })).toContainText("docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv");
    await expect(page.getByText("product_git_sync_live")).toHaveCount(0);
    await expect(page.getByText("git_sync.live")).toHaveCount(0);
    await expect(page.getByText("Information sources for this view")).toBeVisible();
    await expect(page.getByText("tools/dashboard-data")).toBeVisible();

    await navigation.getByRole("link", { name: /Safety Actions/ }).click();
    await expect(page.getByRole("heading", { name: "Safety Actions" })).toBeVisible();
    await expectCenteredSvg(page.locator(".page-title__icon"));
    await expectCenteredSvg(page.locator(".decision-summary__icon"));
    await expectCenteredSvg(page.locator(".security-mini-card__icon"));
    await expect(page.locator(".security-mini-card")).toHaveCount(4);
    const safetyCardIconBackgrounds = await page.locator(".security-mini-card__icon").evaluateAll((icons) => icons.map((icon) => getComputedStyle(icon).backgroundColor));
    expect(safetyCardIconBackgrounds.every((background) => background !== "rgba(0, 0, 0, 0)")).toBe(true);
    await expect(page.locator("#partial-failures-heading")).toBeVisible();
    await expect(page.locator(".failure-row")).toHaveCount(1);
    await expect(page.locator(".failure-row", { hasText: "Required product evidence has not run." })).toBeVisible();
    await expect(page.getByText("security_gate")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Command Previews (display only)" })).toBeVisible();
    await expect(page.locator(".display-only-badge").first()).toContainText("Display only");
    await expect(page.getByText("preview_only")).toHaveCount(0);
    await expect(page.getByText("git_workflow_merge_approval")).toHaveCount(0);
    await expect(page.locator(".command-preview")).toHaveCount(4);
    await expect(page.locator(".command-preview .command-chip")).toHaveCount(4);
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
    await expect(settingsView.locator(".settings-row[data-settings-row-id='git_push_automation']").locator(".settings-row__open")).toContainText("Editable here");
    await expect(settingsView.locator(".settings-row[data-settings-row-id='git_merge_execution']").locator(".settings-row__open")).toContainText("Editable here");
    await learningModeRow.click();
    await expect(page.locator(".settings-modal")).toBeVisible();
    await expect(page.locator(".settings-modal__close")).toBeFocused();
    const modalEyebrowSize = await page.locator(".settings-modal__header small").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const modalStatusSize = await page.locator(".settings-modal__status > div > span").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(modalEyebrowSize).toBeGreaterThan(modalStatusSize);
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".settings-modal__footer button")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator(".settings-modal__close")).toBeFocused();
    await expect(page.locator(".settings-modal")).toContainText("Proposed value");
    await page.locator(".settings-value-select select").selectOption("B");
    await page.getByRole("button", { name: /Review change/ }).click();
    await expect(page.locator(".settings-result")).toContainText("Plan ready");
    await page.getByLabel("I confirm this settings update.").check();
    await page.unroute("**/dashboard-data.json");
    await routeDashboardDataPayload(page, dashboardSettingFixture("learning_mode", "B", "6"));
    await page.getByRole("button", { name: /Apply setting/ }).click();
    await expect(page.locator(".settings-modal")).toHaveCount(0);
    await expect(page.locator(".settings-apply-feedback")).toHaveCount(0);
    await expect(learningModeRow).toContainText("B: Short guidance");
    expect(settingsCalls.map((call) => call.command)).toEqual(["plan", "apply"]);
    expect(settingsCalls[1].payload).toMatchObject({ setting_id: "learning_mode", value: "B", menu_id: "step_1_14", confirm: true });
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
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
    await routeDashboardDataPayload(page, dashboardLocaleFixture("zh-CN", "zh-CN", "f"));
    await page.goto("http://lesson.local/dashboard-control-center/index.html#settings");
    await expect(page.locator(".app-shell")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#settings-heading")).toHaveText("设置");
    await expect(page.locator(".category-nav__link[href='#documents']")).toContainText("文档");
    let hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);

    await page.unroute("**/dashboard-data.json");
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
    await expect(page.getByText("Information sources for this view")).toBeVisible();
    await expect(page.getByText("[redacted secret-like data]", { exact: false })).toHaveCount(0);
    await expect(page.getByText("TOKEN=abcdefghijklmnop", { exact: false })).toHaveCount(0);
  });

  test("updates changed dashboard data without reloading the page", async ({ page }) => {
    const methods = [];
    await page.unroute("**/dashboard-data.json");
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
    await page.unroute("**/dashboard-data.json");
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

    await page.unroute("**/dashboard-data.json");
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

    await page.unroute("**/dashboard-data.json");
    await routeDashboardData(page, legacySnapshot);
    await page.goto("http://lesson.local/dashboard-control-center/index.html#settings");

    const settingsView = page.locator("#settings");
    await expect(settingsView).toBeVisible();
    await expect(page.getByText("Dashboard Data Unavailable")).toHaveCount(0);
    await expect(settingsView.locator("#settings-unavailable .sidebar-page-card")).toHaveCount(1);

    const invalidSettings = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    invalidSettings.settings.items[0].source_file = "/tmp/unsafe-settings.tsv";
    await page.unroute("**/dashboard-data.json");
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

    await page.unroute("**/dashboard-data.json");
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
    await expect(page.getByText("設定以外は読み取り専用です。")).toBeVisible();
    await expect(page.getByText("カテゴリ別の状態")).toHaveCount(0);
    await expect(page.locator(".menu-tile.is-selected")).toContainText(/STEP 1-14\s*実践レッスン/);
    await expect(page.locator("[data-overview-status-card='lessons']")).toContainText(/11\s*\/\s*14/);
    await expect(page.locator("[data-overview-status-card='security']")).toContainText("ブロッカー: 1");
    await expect(page.locator(".common-status-card--security")).toContainText("Security確認");
    await expect(page.locator(".common-status-card--git .common-status-op")).toHaveCount(4);

    await navigation.getByRole("link", { name: /レッスン/ }).click();
    await expect(page.getByLabel("詳細ページ判断サマリー")).toBeVisible();
    await expect(page.getByText("このページで確認すること")).toBeVisible();
    await expect(page.getByRole("heading", { name: "STEP 1-7 基礎レッスン" })).toBeVisible();
    await expect(page.locator(".lesson-progress-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "応用レッスン" })).toBeVisible();

    await navigation.getByRole("link", { name: /開発ワークフロー/ }).click();
    await expect(page.getByLabel("詳細ページ判断サマリー")).toBeVisible();
    await expect(page.locator(".workflow-mini-card")).toHaveCount(5);
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
