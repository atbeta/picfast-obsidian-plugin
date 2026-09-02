/**
 * Inline i18n for the plugin. Two locales (en + zh-CN); strings live in
 * plain TS objects so the bundler can tree-shake unused locales.
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
  noticeUploaded: "PicFast: uploaded",
  noticeFailed: "PicFast upload failed: ",
  noticeMissingConfig: "PicFast: base URL not set. Open settings to configure.",
  noticeAlreadyRemote:
    "PicFast: this image is already a remote URL — skipping.",
  noticeResolveFailed: "PicFast: could not resolve image path: ",
  noticeReadFailed: "PicFast: failed to read image file: ",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: auto-filled ${fields.join(", ")} from CLI config / env`,
  noticeMirrorSaved: "PicFast: local copy saved to ",
  noticeMirrorFailed: "PicFast: local copy failed (upload unaffected): ",
  noticeFallbackSaved:
    "PicFast: upload failed — image saved locally instead: ",
  noticeOpenImage: "Click to open the image",
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
  settingNamePattern: "Filename template",
  settingNamePatternDesc:
    "Renames images on upload. Tokens: {{fileName}} (note name), " +
    "{{imageNameKey}} (frontmatter), {{DATE:YYYYMMDD-HHmmss}}, " +
    "{{originalName}}. Duplicates get -2, -3… suffixes. " +
    "Empty = keep the original filename.",
  settingNamePatternPlaceholder: "{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}",
  settingRenameScope: "Rename scope",
  settingRenameScopeDesc:
    "Which uploads the filename template applies to. Pasted screenshots " +
    "have no meaningful name; dragged files usually do.",
  settingRenameScopeOptionPaste: "Pasted images only",
  settingRenameScopeOptionAll: "Pasted and dragged images",
  settingLocalMirror: "Local mirror",
  settingLocalMirrorDesc:
    "Keep a copy of every uploaded image in '<note name>.assets/' next to " +
    "the note, as insurance if the image host becomes unavailable. " +
    "If an upload fails, the image is saved locally instead so the paste " +
    "still works.",
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
  noticeUploaded: "PicFast: 上传成功",
  noticeFailed: "PicFast 上传失败：",
  noticeMissingConfig: "PicFast: 未设置 base URL，请打开设置。",
  noticeAlreadyRemote: "PicFast: 这张图已经是远程 URL，跳过。",
  noticeResolveFailed: "PicFast: 无法解析图片路径：",
  noticeReadFailed: "PicFast: 读取图片文件失败：",
  noticeAutoPopulated: (fields: string[]) =>
    `PicFast: 已从 CLI 配置 / 环境变量自动填充 ${fields.join(", ")}`,
  noticeMirrorSaved: "PicFast: 已在本地保留副本 ",
  noticeMirrorFailed: "PicFast: 本地副本保存失败（不影响上传）：",
  noticeFallbackSaved: "PicFast: 上传失败，已改为保存到本地：",
  noticeOpenImage: "点击打开图片",
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc:
    "你的 PicFast 实例地址，例如 https://picfast.example.com。" +
    "留空时自动从 PICFAST_URL 环境变量或 picfast CLI 配置读取。",
  settingApiToken: "API token",
  settingApiTokenDesc:
    "可选。匿名上传留空；如果你的实例需要鉴权则填写。" +
    "自动从 PICFAST_TOKEN 环境变量或 picfast CLI 配置读取。",
  settingApiTokenPlaceholder: "可选",
  settingUploadBehavior: "上传行为",
  settingUploadBehaviorDesc:
    "粘贴或拖入图片时的默认行为。Ask 模式每次都会弹出一个简短菜单供你选择。",
  settingUploadBehaviorOptionOff: "关闭（Obsidian 默认行为）",
  settingUploadBehaviorOptionAsk: "每次询问（推荐）",
  settingUploadBehaviorOptionOn: "总是上传",
  settingNamePattern: "文件名模板",
  settingNamePatternDesc:
    "上传时自动重命名。可用标记：{{fileName}}（文档名）、" +
    "{{imageNameKey}}（笔记 frontmatter）、{{DATE:YYYYMMDD-HHmmss}}、" +
    "{{originalName}}（原始文件名）。重名自动加 -2、-3… 序号。" +
    "留空 = 保留原始文件名。",
  settingNamePatternPlaceholder: "{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}",
  settingRenameScope: "重命名范围",
  settingRenameScopeDesc:
    "文件名模板应用到哪些图片。粘贴的截图通常没有有意义的名字，" +
    "拖入的文件一般自带名字。",
  settingRenameScopeOptionPaste: "仅粘贴的图片",
  settingRenameScopeOptionAll: "粘贴和拖拽的图片",
  settingLocalMirror: "本地镜像",
  settingLocalMirrorDesc:
    "在笔记同目录的「文档名.assets/」里为每张成功上传的图片保留一份副本，" +
    "图床失效时仍有图可用。上传失败时也会自动保存到本地，粘贴不落空。",
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
