export const DASHBOARD_LOCALE_POLICY = Object.freeze([
  { code: "ja", aliases: ["ja", "ja-JP"], intlLocale: "ja-JP", direction: "ltr", nativeName: "日本語", englishName: "Japanese" },
  { code: "en", aliases: ["en", "en-US", "en-GB"], intlLocale: "en-US", direction: "ltr", nativeName: "English", englishName: "English" },
  { code: "ko", aliases: ["ko", "ko-KR"], intlLocale: "ko-KR", direction: "ltr", nativeName: "한국어", englishName: "Korean" },
  { code: "zh-CN", aliases: ["zh", "zh-CN", "zh-Hans", "zh-cn", "zh_CN"], intlLocale: "zh-CN", direction: "ltr", nativeName: "简体中文", englishName: "Simplified Chinese" },
  { code: "zh-TW", aliases: ["zh-TW", "zh-Hant", "zh-tw", "zh_TW"], intlLocale: "zh-TW", direction: "ltr", nativeName: "繁體中文", englishName: "Traditional Chinese" },
  { code: "es", aliases: ["es", "es-ES", "es-MX"], intlLocale: "es-ES", direction: "ltr", nativeName: "Español", englishName: "Spanish" },
  { code: "pt-BR", aliases: ["pt", "pt-BR", "pt-br", "pt_BR"], intlLocale: "pt-BR", direction: "ltr", nativeName: "Português do Brasil", englishName: "Brazilian Portuguese" },
  { code: "fr", aliases: ["fr", "fr-FR"], intlLocale: "fr-FR", direction: "ltr", nativeName: "Français", englishName: "French" },
  { code: "de", aliases: ["de", "de-DE"], intlLocale: "de-DE", direction: "ltr", nativeName: "Deutsch", englishName: "German" },
  { code: "id", aliases: ["id", "id-ID"], intlLocale: "id-ID", direction: "ltr", nativeName: "Bahasa Indonesia", englishName: "Indonesian" },
  { code: "vi", aliases: ["vi", "vi-VN"], intlLocale: "vi-VN", direction: "ltr", nativeName: "Tiếng Việt", englishName: "Vietnamese" },
  { code: "th", aliases: ["th", "th-TH"], intlLocale: "th-TH", direction: "ltr", nativeName: "ไทย", englishName: "Thai" },
  { code: "hi", aliases: ["hi", "hi-IN"], intlLocale: "hi-IN", direction: "ltr", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "ar", aliases: ["ar", "ar-SA", "ar-EG"], intlLocale: "ar-SA", direction: "rtl", nativeName: "العربية", englishName: "Arabic" },
]);

export const DASHBOARD_LOCALE_CODES = Object.freeze(DASHBOARD_LOCALE_POLICY.map((locale) => locale.code));
export const DASHBOARD_LOCALE_CODE_SET = new Set(DASHBOARD_LOCALE_CODES);
