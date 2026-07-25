/**
 * Shared editor-image handler used by both the drop event and the
 * paste event. Identifies image entries in a DataTransfer and decides
 * whether to upload (always / ask / never) based on user settings.
 *
 * Returns `true` when the handler has fully consumed the event so the
 * caller knows it can `preventDefault()` and bail without re-inserting
 * anything (Obsidian's default behaviour is to save the image into the
 * vault's attachment folder, which we want to suppress in `on` mode).
 */

import { App, Editor, Menu } from "obsidian";

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
  /**
   * Mouse event used to position the ask menu. Optional; when omitted
   * (e.g. for paste, which has no mouse position) the menu anchors at
   * the centre of the active editor.
   */
  anchor?: MouseEvent;
}

export async function handleEditorImage(
  opts: EditorImageHandlerOpts,
): Promise<boolean> {
  const image = pickFirstImage(opts.dataTransfer);
  if (!image) return false;

  const behavior = opts.settings.uploadBehavior;
  if (behavior === "off") return false;

  if (behavior === "ask") {
    return askAndUpload(opts, image);
  }
  // behavior === "on"
  await uploadFromDataTransfer(opts, image);
  return true;
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

async function askAndUpload(
  opts: EditorImageHandlerOpts,
  image: PickedImage,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle(t().menuUpload)
        .setIcon("cloud-upload")
        .onClick(async () => {
          settle(true); // consumed
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
        .onClick(() => {
          settle(false); // tell caller to let Obsidian default behaviour run
        }),
    );

    menu.addItem((item) =>
      item
        .setTitle(t().menuCancel)
        .setIcon("x")
        .onClick(() => {
          settle(true); // consumed: don't fall back to default save
        }),
    );

    // Treat menu dismissal (Esc / click-away) as cancel.
    // (Obsidian Menu doesn't expose a hide event in its typings, so we
    // approximate by treating a no-selection within a generous timeout as
    // a dismissal — settled=true at that point becomes a no-op.)
    const dismissTimer = window.setTimeout(() => settle(true), 60_000);

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

    // Best-effort: when the menu closes (callback returned or Esc pressed),
    // clear the dismiss timer. Menu doesn't expose its lifecycle directly,
    // so we rely on the per-item callbacks having already settled.
    void dismissTimer;

    void opts.sourceLabel;
  });
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

  await performUpload({
    data: buf,
    filename,
    settings: opts.settings,
    editor: opts.editor,
  });
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