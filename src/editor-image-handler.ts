/**
 * Shared editor-image handler used by both the drop event and the
 * paste event.
 *
 * IMPORTANT: `event.preventDefault()` and `event.stopPropagation()` must
 * be called **synchronously** inside the capture-phase listener. By the
 * time an `.then()` callback runs, the event has already finished
 * propagating and Obsidian's default handler has already inserted its
 * `![[attachment.png]]` — preventing default at that point is a no-op,
 * and you end up with two copies in the editor.
 *
 * So the rule is:
 *   - If we know synchronously that we'll handle the image
 *     (uploadBehavior !== off, image present), preventDefault immediately.
 *   - The actual upload is still async.
 *   - If the user picks "Save locally" from the ask menu, we emulate
 *     Obsidian's default behaviour ourselves (vault.createBinary + insert
 *     `![[name]]`) because we've already swallowed the event.
 */

import { App, Editor, Menu } from "obsidian";

import { readImageNameKey } from "./frontmatter";
import { t } from "./i18n";
import { PicFastSettings } from "./settings";
import { performUpload } from "./upload-flow";

export interface EditorImageHandlerOpts {
  app: App;
  editor: Editor;
  dataTransfer: DataTransfer;
  settings: PicFastSettings;
  /** Source name for diagnostics and for the ask menu. */
  sourceLabel: "drop" | "paste";
  /** Original DOM event — needed to call preventDefault synchronously. */
  event: Event;
  /**
   * Mouse event used to position the ask menu. Optional; when omitted
   * (e.g. for paste, which has no mouse position) the menu anchors at
   * the centre of the active editor.
   */
  anchor?: MouseEvent;
}

/**
 * Must be called from a capture-phase DOM listener. Decides
 * synchronously whether to consume the event, then runs the upload
 * (sync or after a user choice).
 */
export function handleEditorImage(
  opts: EditorImageHandlerOpts,
): void {
  const image = pickFirstImage(opts.dataTransfer);
  if (!image) return; // not an image — let Obsidian handle normally

  const behavior = opts.settings.uploadBehavior;
  if (behavior === "off") return; // user opted out — let Obsidian handle

  // Synchronously swallow the event so Obsidian's default handler does
  // not insert its `![[attachment.png]]` link.
  opts.event.preventDefault();
  opts.event.stopPropagation();

  if (behavior === "on") {
    void uploadFromDataTransfer(opts, image);
    return;
  }

  // behavior === "ask"
  void askAndHandle(opts, image);
}

interface PickedImage {
  file: File;
  ext: string;
}

function pickFirstImage(dt: DataTransfer): PickedImage | null {
  // Prefer items (gives us mime + filename); fall back to files[].
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i];
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    if (!file.type.startsWith("image/")) continue;
    return { file, ext: extensionFromMime(file.type) };
  }
  for (let i = 0; i < dt.files.length; i++) {
    const file = dt.files[i];
    if (!file.type.startsWith("image/")) continue;
    return { file, ext: extensionFromMime(file.type) };
  }
  return null;
}

async function askAndHandle(
  opts: EditorImageHandlerOpts,
  image: PickedImage,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle(t().menuUpload)
        .setIcon("cloud-upload")
        .onClick(async () => {
          resolve();
          try {
            await uploadFromDataTransfer(opts, image);
          } catch {
            // performUpload already surfaced a Notice with the failure.
          }
        }),
    );

    menu.addItem((item) =>
      item
        .setTitle(t().menuSaveLocal)
        .setIcon("save")
        .onClick(async () => {
          resolve();
          try {
            await saveLocal(opts, image);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[PicFast] save-local failed:", err);
          }
        }),
    );

    menu.addItem((item) =>
      item
        .setTitle(t().menuCancel)
        .setIcon("x")
        .onClick(() => {
          resolve();
        }),
    );

    if (opts.anchor) {
      menu.showAtMouseEvent(opts.anchor);
    } else {
      // Paste path: no mouse event. Centre the menu on the active editor.
      const rect = (opts.editor as unknown as {
        cm?: { contentEl?: HTMLElement };
      }).cm?.contentEl?.getBoundingClientRect();
      const x = rect
        ? rect.left + rect.width / 2
        : window.innerWidth / 2;
      const y = rect
        ? rect.top + rect.height / 2
        : window.innerHeight / 2;
      const fakeEvent = new MouseEvent("contextmenu", {
        clientX: x,
        clientY: y,
        bubbles: true,
      });
      menu.showAtMouseEvent(fakeEvent);
    }

    void opts.sourceLabel;
  });
}

/**
 * Emulate Obsidian's default behaviour: save the image as an attachment
 * in the vault and insert `![[name]]`. We need this because we already
 * synchronously swallowed the original paste / drop event above.
 */
async function saveLocal(
  opts: EditorImageHandlerOpts,
  image: PickedImage,
): Promise<void> {
  const buffer = await image.file.arrayBuffer();
  const filename = sanitizeFilename(image.file.name || `image.${image.ext}`);

  const activeFile = opts.app.workspace.getActiveFile();
  const targetPath = await opts.app.fileManager.getAvailablePathForAttachment(
    filename,
    activeFile?.path,
  );
  const created = await opts.app.vault.createBinary(
    targetPath,
    buffer,
  );
  // Use the basename (not the full vault-relative path) so the link
  // resolves correctly from any note that embeds it.
  opts.editor.replaceSelection(`![[${created.name}]]`);
}

async function uploadFromDataTransfer(
  opts: EditorImageHandlerOpts,
  image: PickedImage,
): Promise<void> {
  const buf = await image.file.arrayBuffer();
  const filename =
    image.file.name && image.file.name.length > 0
      ? image.file.name
      : `picfast-${opts.sourceLabel}-${Date.now()}.${image.ext}`;

  // Template renaming: paste always qualifies; drop only when the
  // rename scope covers dragged files too.
  const isPaste = opts.sourceLabel === "paste";
  const allowRename = isPaste || opts.settings.renameScope === "all";

  // Cache getActiveFile once — used for both `activeFile` (mirror dir +
  // dedupe key) and the filename-template's frontmatter lookup, and the
  // workspace can technically switch between calls if the event handler
  // races with a tab change.
  const activeFile = opts.app.workspace.getActiveFile();

  await performUpload({
    app: opts.app,
    data: buf,
    filename,
    settings: opts.settings,
    editor: opts.editor,
    activeFile,
    allowRename,
    imageNameKey: readImageNameKey(opts.app),
  });
}

function sanitizeFilename(name: string): string {
  // Obsidian's file manager will rewrite invalid names anyway, but
  // strip path separators up front to avoid surprises.
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : `image-${Date.now()}.png`;
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/bmp":
      return "bmp";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    case "image/x-icon":
      return "ico";
    case "image/tiff":
      return "tif";
    default:
      return "png";
  }
}