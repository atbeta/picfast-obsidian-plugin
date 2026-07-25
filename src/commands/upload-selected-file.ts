/**
 * Command: upload a file the user picks from a native open dialog.
 *
 * Useful for re-uploading existing local images (e.g. a screenshot
 * already saved in the vault's attachment folder) without copy/paste.
 */

import { Editor, Notice } from "obsidian";

import { PicFastSettings } from "../settings";
import { performUpload } from "../upload-flow";

export interface UploadSelectedFileOpts {
  editor: Editor;
  settings: PicFastSettings;
}

export async function uploadSelectedFile(
  opts: UploadSelectedFileOpts,
): Promise<void> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = false;
  input.style.display = "none";
  document.body.appendChild(input);

  const file = await new Promise<File | null>((resolve) => {
    input.addEventListener(
      "change",
      () => {
        const f = input.files?.[0] ?? null;
        document.body.removeChild(input);
        resolve(f);
      },
      { once: true },
    );
    input.addEventListener(
      "cancel",
      () => {
        document.body.removeChild(input);
        resolve(null);
      },
      { once: true },
    );
    input.click();
  });

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    new Notice("Selected file is not an image.");
    return;
  }

  const buffer = await file.arrayBuffer();
  await performUpload({
    data: buffer,
    filename: file.name,
    settings: opts.settings,
    editor: opts.editor,
  });
}