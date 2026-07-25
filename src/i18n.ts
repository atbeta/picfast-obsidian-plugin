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
  cmdUploadClipboard: "PicFast: Upload image from clipboard",
  cmdUploadClipboardRibbon: "Upload to PicFast",
  cmdUploadFile: "PicFast: Upload selected image file",
  cmdUploadAtCursor: "PicFast: Upload image at cursor",
  menuUpload: "Upload to PicFast",
  menuSaveLocal: "Save locally",
  menuCancel: "Cancel",
  noticeUploading: "Uploading to PicFast…",
  noticeUploaded: "PicFast: uploaded ✓",
  noticeFailed: "PicFast upload failed: ",
  noticeMissingConfig: "PicFast: base URL not set. Open settings to configure.",
  noticeAlreadyRemote:
    "PicFast: this image is already a remote URL — skipping.",
  noticeResolveFailed: "PicFast: could not resolve image path: ",
  noticeReadFailed: "PicFast: failed to read image file: ",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: auto-filled ${fields.join(", ")} from CLI config / env`,
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc:
    "Your PicFast instance root, e.g. https://picfast.example.com. " +
    "Leave empty to auto-fill from PICFAST_URL env var or `picfast` CLI config.",
  settingApiToken: "API token",
  settingApiTokenDesc:
    "Optional. Leave empty for anonymous uploads; set if your instance requires auth. " +
    "Auto-filled from PICFAST_TOKEN env or `picfast` CLI config.",
  settingApiTokenPlaceholder: "optional",
  settingUploadBehavior: "Upload behavior",
  settingUploadBehaviorDesc:
    "What happens when you paste or drop an image in the editor. " +
    "'Ask' shows a small menu so you can choose each time.",
  settingUploadBehaviorOptionOff: "Off (Obsidian default)",
  settingUploadBehaviorOptionAsk: "Ask each time (recommended)",
  settingUploadBehaviorOptionOn: "Always upload",
};

export const zhCN: typeof en = {
  cmdUploadClipboard: "PicFast: 从剪贴板上传图片",
  cmdUploadClipboardRibbon: "上传到 PicFast",
  cmdUploadFile: "PicFast: 上传选中的图片文件",
  cmdUploadAtCursor: "PicFast: 上传光标处的图片",
  menuUpload: "上传到 PicFast",
  menuSaveLocal: "保存到本地",
  menuCancel: "取消",
  noticeUploading: "正在上传到 PicFast…",
  noticeUploaded: "PicFast: 上传成功 ✓",
  noticeFailed: "PicFast 上传失败：",
  noticeMissingConfig: "PicFast: 未设置 base URL，请打开设置。",
  noticeAlreadyRemote: "PicFast: 这张图已经是远程 URL，跳过。",
  noticeResolveFailed: "PicFast: 无法解析图片路径：",
  noticeReadFailed: "PicFast: 读取图片文件失败：",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: 已从 CLI 配置 / 环境变量自动填充 ${fields.join(", ")}`,
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc:
    "你的 PicFast 实例地址，例如 https://picfast.example.com。" +
    "留空时自动从 PICFAST_URL 环境变量或 `picfast` CLI 配置读取。",
  settingApiToken: "API token",
  settingApiTokenDesc:
    "可选。匿名上传留空；如果你的实例需要鉴权则填写。" +
    "自动从 PICFAST_TOKEN 环境变量或 `picfast` CLI 配置读取。",
  settingApiTokenPlaceholder: "可选",
  settingUploadBehavior: "上传行为",
  settingUploadBehaviorDesc:
    "粘贴或拖入图片时的默认行为。Ask 会弹一个 1-click 小菜单让你选择。",
  settingUploadBehaviorOptionOff: "Off（使用 Obsidian 默认行为）",
  settingUploadBehaviorOptionAsk: "每次询问（推荐）",
  settingUploadBehaviorOptionOn: "总是上传",
};

const MESSAGES: Record<Locale, typeof en> = {
  en,
  "zh-CN": zhCN,
};

let currentLocale: Locale = "en";

export function detectLocale(): Locale {
  try {
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