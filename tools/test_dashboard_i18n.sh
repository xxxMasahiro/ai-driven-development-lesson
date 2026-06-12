#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=tools/lib/lesson_common.sh
source "$ROOT/tools/lib/lesson_common.sh"
# shellcheck source=tools/lib/dashboard_data.sh
source "$ROOT/tools/lib/dashboard_data.sh"

expected_codes="$(lesson_supported_language_codes)"
dashboard_codes="$(dashboard_standard_ui_locale_codes)"

if [[ "$dashboard_codes" != "$expected_codes" ]]; then
  printf 'dashboard locale codes must match lesson-supported languages: expected %s, got %s\n' "$expected_codes" "$dashboard_codes" >&2
  exit 1
fi

for code in ${expected_codes//|/ }; do
  resolved="$(dashboard_ui_locale_for_workflow_language "$code")"
  if [[ "$resolved" != "$code" ]]; then
    printf 'dashboard locale resolver changed canonical code %s to %s\n' "$code" "$resolved" >&2
    exit 1
  fi
done

if [[ "$(dashboard_ui_locale_for_workflow_language zh)" != "zh-CN" ]]; then
  printf 'dashboard locale resolver must keep zh as a zh-CN alias\n' >&2
  exit 1
fi

if [[ "$(dashboard_ui_direction_for_locale ar)" != "rtl" ]]; then
  printf 'Arabic dashboard locale must be rtl\n' >&2
  exit 1
fi

for code in ${expected_codes//|/ }; do
  if [[ "$code" != "ar" && "$(dashboard_ui_direction_for_locale "$code")" != "ltr" ]]; then
    printf 'dashboard locale %s must be ltr\n' "$code" >&2
    exit 1
  fi
done

NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-warnings" EXPECTED_DASHBOARD_LOCALES="$expected_codes" node --input-type=module <<'NODE'
import {
  DASHBOARD_LOCALE_CODES,
  DASHBOARD_LOCALE_POLICY,
  createTranslator,
  dashboardMessageKeys,
  dashboardMessagesForLocale,
  getDashboardLocaleDirection,
  getDashboardIntlLocale,
  normalizeDashboardLocale,
} from "./dashboard-control-center/src/i18n.js";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const expectedCodes = process.env.EXPECTED_DASHBOARD_LOCALES.split("|");
if (DASHBOARD_LOCALE_CODES.join("|") !== expectedCodes.join("|")) {
  fail(`Dashboard locale policy drifted from lesson languages: ${DASHBOARD_LOCALE_CODES.join("|")}`);
}

if (normalizeDashboardLocale("zh") !== "zh-CN" || normalizeDashboardLocale("zh-Hant") !== "zh-TW") {
  fail("Chinese aliases must normalize to canonical Dashboard locales");
}

if (normalizeDashboardLocale("custom") !== "en") {
  fail("custom workflow language values must not become Dashboard UI locales");
}

const policies = new Map(DASHBOARD_LOCALE_POLICY.map((policy) => [policy.code, policy]));
for (const code of expectedCodes) {
  const policy = policies.get(code);
  if (!policy) {
    fail(`Missing Dashboard locale policy for ${code}`);
  }
  for (const field of ["code", "aliases", "intlLocale", "direction", "nativeName", "englishName"]) {
    if (!policy[field] || (Array.isArray(policy[field]) && policy[field].length === 0)) {
      fail(`Dashboard locale ${code} is missing policy field ${field}`);
    }
  }
  if (getDashboardIntlLocale(code) !== policy.intlLocale) {
    fail(`Dashboard locale ${code} Intl locale mismatch`);
  }
  const expectedDirection = code === "ar" ? "rtl" : "ltr";
  if (policy.direction !== expectedDirection || getDashboardLocaleDirection(code) !== expectedDirection) {
    fail(`Dashboard locale ${code} direction must be ${expectedDirection}`);
  }
}

const keys = dashboardMessageKeys();
if (!keys.includes("settingsPage.notice.title") || !keys.includes("settingsPage.notice.detail")) {
  fail("Dashboard dictionaries must include the Settings refresh notice keys");
}
const consistencyKeys = [
  "settingsPage.modal.consistencyTitle",
  "settingsPage.modal.planBlocked",
  "settingsPage.consistency.noApprovedWritePath",
  "settingsPage.consistency.worktreeRequiresBranch",
  "settingsPage.consistency.prCreationRequiresBranch",
  "settingsPage.consistency.prCiRequiresBranch",
  "settingsPage.consistency.mergeRequiresBranch",
  "settingsPage.consistency.developerAutoMergeTakesPrecedence",
  "settingsPage.consistency.next.enableBranchOrDirectMain",
  "settingsPage.consistency.next.enableBranchOrDisableWorktree",
  "settingsPage.consistency.next.enableBranchOrManualPr",
  "settingsPage.consistency.next.enableBranchOrManualPrCi",
  "settingsPage.consistency.next.enableBranchOrManualMerge",
  "settingsPage.consistency.next.reviewDeveloperAutoMergeGates",
];
for (const key of consistencyKeys) {
  if (!keys.includes(key)) {
    fail(`Dashboard dictionaries must include Settings consistency key ${key}`);
  }
}

const englishDictionary = dashboardMessagesForLocale("en");
const maxAllowedEnglishMatches = Math.ceil(keys.length * 0.15);
for (const code of expectedCodes) {
  const dictionary = dashboardMessagesForLocale(code);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(dictionary, key) || typeof dictionary[key] !== "string") {
      fail(`Dashboard locale ${code} is missing dictionary key ${key}`);
    }
  }
  const t = createTranslator(code);
  if (t("settingsPage.title", "__missing__") === "__missing__") {
    fail(`Dashboard locale ${code} translator must resolve Settings title`);
  }
  if (code !== "en" && t("settingsPage.title") === createTranslator("en")("settingsPage.title")) {
    fail(`Dashboard locale ${code} must not leave core Settings chrome in English`);
  }
  if (code !== "en") {
    const englishMatches = keys.filter((key) => dictionary[key] === englishDictionary[key]);
    if (englishMatches.length > maxAllowedEnglishMatches) {
      fail(`Dashboard locale ${code} appears to reuse English fallback text for ${englishMatches.length}/${keys.length} keys`);
    }
    for (const key of consistencyKeys) {
      if (dictionary[key] === englishDictionary[key] || dictionary[key].includes(key)) {
        fail(`Dashboard locale ${code} must translate Settings consistency key ${key}`);
      }
    }
  }
}
NODE

printf 'Dashboard i18n test passed.\n'
