/**
 * Command: upload the image currently on the clipboard.
 *
 * Triggered by ribbon icon and by command palette. If the clipboard
 * has no image, show a Notice and bail.
 */

import { Editor, Notice } from "obsidian";

import { PicFastSettings } from "../settings";
import { performUpload } from "../upload-flow";

export interface UploadFromClipboardOpts {
  editor: Editor;
  settings: PicFastSettings;
}

const CLIPBOARD_FILENAME_PREFIX = "picfast-clipboard-";

export async function uploadFromClipboard(
  opts: UploadFromClipboardOpts,
): Promise<void> {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    new Notice("Clipboard image read is not supported in this Obsidian build.");
    return;
  }

  let clipboardItems: ClipboardItem[];
  try {
    clipboardItems = await navigator.clipboard.read();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    new Notice(`Could not read clipboard: ${msg}`);
    return;
  }

  const item = clipboardItems.find((i) => i.types.some((ty) => ty.startsWith("image/")));
  if (!item) {
    new Notice("Clipboard does not contain an image.");
    return;
  }

  const imageType = item.types.find((ty) => ty.startsWith("image/"))!;
  let blob: Blob;
  try {
    blob = await item.getType(imageType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    new Notice(`Could not read clipboard image: ${msg}`);
    return;
  }

  const ext = extensionFromMime(imageType);
  const filename = `${CLIPBOARD_FILENAME_PREFIX}${Date.now()}.${ext}`;
  const buffer = await blob.arrayBuffer();

  await performUpload({
    data: buffer,
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
    default:
      return "png";
  }
}