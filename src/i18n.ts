/**
 * Inline i18n for v0.1. Two locales (en + zh-CN) is enough; we don't
 * pull a runtime library. Strings live in plain TS objects so the
 * Obsidian bundler can tree-shake unused locales when more are added.
 *
 * Locale detection: respect `moment.locale()` style — fall back to en.
 * Obsidian exposes `obsidian.getLocale()` since 1.8; we default to en
 * for safety on older versions.
 */

/**
 * Inline i18n for v0.1. Two locales (en + zh-CN) is enough; we don't
 * pull a runtime library. Strings live in plain TS objects so the
 * Obsidian bundler can tree-shake unused locales when more are added.
 *
 * Locale detection: prefer `window.moment.locale()` (always available in
 * Obsidian, including older builds). Fall back to en.
 */

export type Locale = "en" | "zh-CN";

export const en = {
  cmdUploadClipboard: "Upload image from clipboard to PicFast",
  cmdUploadClipboardRibbon: "Upload to PicFast",
  cmdUploadFile: "Upload selected image file to PicFast",
  cmdOpenSettings: "Open PicFast settings",
  menuUpload: "Upload to PicFast",
  menuSaveLocal: "Save locally",
  menuCancel: "Cancel",
  noticeUploading: "Uploading to PicFast…",
  noticeUploaded: "PicFast: uploaded ✓",
  noticeFailed: "PicFast upload failed: ",
  noticeMissingConfig: "PicFast: base URL not set. Open settings to configure.",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: auto-filled ${fields.join(", ")} from CLI config / env`,
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc:
    "Your PicFast instance root, e.g. https://picfast.example.com",
  settingApiToken: "API token",
  settingApiTokenDesc:
    "Optional. Leave empty for anonymous uploads; set if your instance requires auth.",
  settingUploadBehavior: "Upload behavior",
  settingUploadBehaviorDesc:
    "What happens when you paste or drop an image in the editor. " +
    "'Ask' shows a small menu so you can choose each time.",
  settingDefaultFormat: "Insert format",
  settingDefaultFormatDesc:
    "How to insert the uploaded image. Markdown is the most common.",
  settingCliAuto: "Auto-discover `picfast` CLI config",
  settingCliAutoDesc:
    "Read ~/.config/picfast/config.json or PICFAST_URL / PICFAST_TOKEN env vars " +
    "when settings are empty. Values you set here always win.",
};

export const zhCN: typeof en = {
  cmdUploadClipboard: "上传剪贴板图片到 PicFast",
  cmdUploadClipboardRibbon: "上传到 PicFast",
  cmdUploadFile: "上传选中的图片文件到 PicFast",
  cmdOpenSettings: "打开 PicFast 设置",
  menuUpload: "上传到 PicFast",
  menuSaveLocal: "保存到本地",
  menuCancel: "取消",
  noticeUploading: "正在上传到 PicFast…",
  noticeUploaded: "PicFast: 上传成功 ✓",
  noticeFailed: "PicFast 上传失败：",
  noticeMissingConfig: "PicFast: 未设置 base URL，请打开设置。",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: 已从 CLI 配置 / 环境变量自动填充 ${fields.join(", ")}`,
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc: "你的 PicFast 实例地址，例如 https://picfast.example.com",
  settingApiToken: "API token",
  settingApiTokenDesc:
    "可选。匿名上传留空；如果你的实例需要鉴权则填写。",
  settingUploadBehavior: "上传行为",
  settingUploadBehaviorDesc:
    "粘贴或拖入图片时的默认行为。Ask 会弹一个 1-click 小菜单让你选择。",
  settingDefaultFormat: "插入格式",
  settingDefaultFormatDesc:
    "如何插入上传后的图片。Markdown 最常用。",
  settingCliAuto: "自动发现 `picfast` CLI 配置",
  settingCliAutoDesc:
    "当设置为空时，读取 ~/.config/picfast/config.json 或环境变量 " +
    "PICFAST_URL / PICFAST_TOKEN。你在这里填写的值始终优先。",
};

const MESSAGES: Record<Locale, typeof en> = {
  en,
  "zh-CN": zhCN,
};

let currentLocale: Locale = "en";

export function detectLocale(): Locale {
  try {
    // Obsidian bundles moment, which exposes the active UI locale.
    const momentLocale = (window as unknown as {
      moment?: { locale?: () => string };
    }).moment?.locale?.();
    const raw = typeof momentLocale === "string" ? momentLocale : "";
    if (raw.toLowerCase().startsWith("zh")) return "zh-CN";
  } catch {
    // moment can be undefined on very old builds; ignore.
  }
  return "en";
}

export function initLocale(): void {
  currentLocale = detectLocale();
}

export function t(): typeof en {
  return MESSAGES[currentLocale];
}

export function getCurrentLocale(): Locale {
  return currentLocale;
}