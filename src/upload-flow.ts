/**
 * Shared upload flow used by the clipboard command, the file picker
 * command, and the editor drop / paste handlers.
 *
 * Responsibilities, in order:
 *   1. decide the filename (template rename vs original name)
 *   2. upload, then insert the returned markdown link
 *   3. optionally mirror the bytes next to the note (localMirror)
 *   4. on failure with localMirror: save the image locally instead, so
 *      the paste never lands as nothing
 *   5. surface progress / result / failures via Notices; the success
 *      notice is clickable and opens the uploaded image URL
 *
 * Callers pass the active file (they already have the workspace
 * context) — this module stays free of workspace lookups.
 */

import { App, Editor, Notice, TFile } from "obsidian";

import { t } from "./i18n";
import { buildRenamedFilename, dedupeName } from "./name-template";
import { PicFastSettings } from "./settings";
import { writeMirrorCopy } from "./local-mirror";
import { uploadImage, UploadResult } from "./uploader";

export interface UploadFlowOpts {
  app: App;
  data: ArrayBuffer | Uint8Array;
  filename: string;
  settings: PicFastSettings;
  editor: Editor;
  /** The note the editor belongs to, when known. Used for the mirror dir. */
  activeFile?: TFile | null;
  /**
   * Whether this source qualifies for template renaming. Paste and
   * clipboard paths pass true; drag passes true only when
   * renameScope is "all". File picker and cursor-upload keep names.
   */
  allowRename?: boolean;
  /** frontmatter imageNameKey of the active note, when present. */
  imageNameKey?: string;
}

export async function performUpload(opts: UploadFlowOpts): Promise<UploadResult> {
  if (!opts.settings.baseUrl) {
    new Notice(t().noticeMissingConfig);
    throw new Error("missing base url");
  }

  const filename = decideFilename(opts);
  const progress = new Notice(t().noticeUploading, 0);
  try {
    const result = await uploadImage(opts.data, filename, opts.settings);
    // Build the markdown link ourselves so we always emit a protocol-
    // prefixed URL. If we relied on `result.markdown` (a server field)
    // and a future server returned a path-only form, cursor re-uploads
    // would later fail with "could not locate image in vault" because
    // `isRemotePath` only recognises http(s)/data/mailto.
    const md = result.markdown?.trim();
    const hasProtocol =
        md && /^!\[[^\]]*\]\(\s*https?:\/\//.test(md);
    const inserted = hasProtocol ? md : `![](${result.url})`;
    opts.editor.replaceSelection(inserted);
    progress.hide();
    showSuccessNotice(filename, result.url);

    if (opts.settings.localMirror) {
      const mirror = await writeMirrorCopy(
        opts.app,
        opts.activeFile ?? null,
        filename,
        opts.data,
      );
      if (!mirror.ok) {
        // eslint-disable-next-line no-console
        console.warn("[PicFast] local mirror failed:", mirror.error);
        new Notice(t().noticeMirrorFailed);
      }
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    progress.hide();

    // Fallback: with localMirror on, a failed upload still becomes a
    // usable local file reference instead of a dead end.
    if (opts.settings.localMirror) {
      const mirror = await writeMirrorCopy(
        opts.app,
        opts.activeFile ?? null,
        filename,
        opts.data,
      );
      if (mirror.ok) {
        new Notice(`${t().noticeFallbackSaved}${mirror.path}\n${msg}`, 8000);
        throw err;
      }
    }
    new Notice(t().noticeFailed + msg, 6000);
    throw err;
  }
}

/**
 * Notice shown after a successful upload: filename + a click handler
 * that opens the uploaded URL in the browser (quick visual check).
 */
function showSuccessNotice(filename: string, url: string): void {
  const notice = new Notice("", 5000);
  const el = notice.noticeEl;
  el.empty();
  el.createSpan({ text: `${t().noticeUploaded} ${filename}` });
  el.createEl("br");
  el.createEl("a", {
    text: t().noticeOpenImage,
    href: url,
  }).addEventListener("click", (evt) => {
    evt.preventDefault();
    window.open(url, "_blank");
  });
}

/**
 * Apply the filename template when configured and this source allows
 * renaming. Duplicate names (same second, same note) get -2, -3…
 * ordinals — tracked per-note within this session, mirroring what the
 * image host shows in its library list.
 */
const usedNames = new Map<string, Set<string>>();

function decideFilename(opts: UploadFlowOpts): string {
  const original = opts.filename;
  if (!opts.allowRename) return original;

  const pattern = opts.settings.namePattern.trim();
  if (!pattern) return original;

  const note = opts.activeFile ?? null;
  const noteKey = note?.path ?? "(no-note)";
  const ctx = {
    noteName: note?.basename ?? "",
    imageNameKey: opts.imageNameKey ?? "",
    originalName: original,
    now: new Date(),
  };
  const ext = extensionOf(original);
  const rendered = buildRenamedFilename(pattern, ext, ctx);
  if (!rendered) return original;

  let used = usedNames.get(noteKey);
  if (!used) {
    used = new Set();
    usedNames.set(noteKey, used);
  }
  const finalName = dedupeName(rendered, used);
  used.add(finalName.toLowerCase());
  return finalName;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}
