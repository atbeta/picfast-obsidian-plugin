/**
 * Shared upload flow used by the clipboard command, the file picker
 * command, and the editor drop / paste handlers.
 *
 * Handles: progress Notice, the actual upload call, inserting the
 * returned link into the active editor, and surfacing failures.
 */

import { Editor, Notice } from "obsidian";

import { t } from "./i18n";
import { PicFastSettings } from "./settings";
import { uploadImage, UploadResult } from "./uploader";

export interface UploadFlowOpts {
  data: ArrayBuffer | Uint8Array;
  filename: string;
  settings: PicFastSettings;
  editor: Editor;
}

export async function performUpload(opts: UploadFlowOpts): Promise<UploadResult> {
  if (!opts.settings.baseUrl) {
    new Notice(t().noticeMissingConfig);
    throw new Error("missing base url");
  }

  const progress = new Notice(t().noticeUploading, 0);
  try {
    const result = await uploadImage(
      opts.data,
      opts.filename,
      opts.settings,
    );
    opts.editor.replaceSelection(result.markdown);
    progress.setMessage(t().noticeUploaded);
    setTimeout(() => progress.hide(), 1500);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    progress.setMessage(t().noticeFailed + msg);
    setTimeout(() => progress.hide(), 6000);
    throw err;
  }
}