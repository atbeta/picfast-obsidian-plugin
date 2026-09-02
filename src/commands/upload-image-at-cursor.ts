/**
 * Command + right-click menu handler that uploads the image whose link
 * is currently under the cursor and rewrites the markdown in place.
 *
 * The replacement preserves the original markdown form:
 *   ![alt](path)        → ![alt](remote-url)
 *   ![[path]]           → ![alt](remote-url)     (always re-renders as
 *                                              standard markdown link;
 *                                              Obsidian still displays
 *                                              them identically in
 *                                              both preview and live mode)
 *
 * Or, if the user had chosen `markdown` format earlier, we keep `alt`
 * text. For wikilinks we reuse the basename (without ext) as alt.
 *
 * Errors leave the original markdown untouched and surface a Notice.
 */

import { App, Editor, Notice } from "obsidian";

import { t } from "../i18n";
import {
  ImageMatch,
  isRemotePath,
} from "../cursor-image";
import {
  readImageBytes,
  resolveImageSource,
} from "../image-source-resolver";
import { PicFastSettings } from "../settings";
import { performUpload } from "../upload-flow";

export interface UploadImageAtCursorOpts {
  app: App;
  editor: Editor;
  match: ImageMatch;
  settings: PicFastSettings;
}

export async function uploadImageAtCursor(
  opts: UploadImageAtCursorOpts,
): Promise<void> {
  const { app, editor, match, settings } = opts;

  if (isRemotePath(match.rawPath)) {
    new Notice(t().noticeAlreadyRemote);
    return;
  }

  // Resolve → read → upload → replace. `activeFile` lets the resolver
  // find files inside `<note>.assets/` (local-mirror + attachment-in-
  // subfolder mode) so a perfectly valid local copy isn't reported as
  // missing.
  let source;
  try {
    source = await resolveImageSource(
      app,
      match.rawPath,
      app.workspace.getActiveFile(),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // When the file is simply not in the vault, surface the "already
    // remote" notice — the most likely cause is a path-only link that
    // is actually hosted elsewhere (or that the user deleted the local
    // copy of). The raw error already lists every path we tried, so
    // this is just a clearer signal than "could not locate".
    if (msg.startsWith("Could not locate image in vault")) {
      new Notice(t().noticeAlreadyRemote);
      return;
    }
    new Notice(t().noticeResolveFailed + msg);
    return;
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await readImageBytes(app, source.file);
  } catch (err) {
    new Notice(
      t().noticeReadFailed + (err instanceof Error ? err.message : String(err)),
    );
    return;
  }

  try {
    const result = await performUpload({
      app,
      data: buffer,
      filename: source.filename,
      settings,
      editor: dummyEditor(editor),
      activeFile: app.workspace.getActiveFile(),
    });

    // Build the replacement string. Prefer markdown form (works in both
    // preview and live mode) — Obsidian renders `![](url)` identically
    // to `![[image]]` for remote URLs.
    const alt = match.alt || basenameNoExt(source.filename);
    const replacement = `![${alt}](${result.url})`;

    editor.replaceRange(replacement, match.range.from, match.range.to);
  } catch {
    // performUpload already surfaced a Notice with the failure; leave
    // the markdown untouched so the user can retry.
  }
}

/**
 * `performUpload` calls `editor.replaceSelection` after upload — but
 * for cursor uploads we want a *replaceRange*, not an insert at the
 * cursor position. Hand it a wrapper that no-ops the selection insert.
 */
function dummyEditor(editor: Editor): Editor {
  return new Proxy(editor, {
    get(target, prop, recv) {
      if (prop === "replaceSelection") {
        return () => {
          /* no-op: uploadImageAtCursor does its own replaceRange */
        };
      }
      return Reflect.get(target, prop, recv);
    },
  });
}

function basenameNoExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.substring(0, dot) : name;
}