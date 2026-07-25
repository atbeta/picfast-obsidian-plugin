/**
 * Resolve the raw text inside an image link to actual bytes on disk.
 *
 * Handles:
 *   - URL decoding (`%20` → ` ` etc.) — Obsidian's editor sometimes
 *     leaves paths URL-encoded even though they were inserted via the
 *     file picker.
 *   - Wikilink size / alias suffixes (`image.png|300` or `image.png|alt`)
 *   - Missing extensions — wikilinks often omit `.png` etc; we try a
 *     small allowlist of common image extensions in vault-relative order.
 *   - Both vault-relative paths and paths relative to the active file.
 *
 * Throws an `Error` (caught by the caller and surfaced as a Notice) when
 * the file can't be located. Callers should not delete the original
 * markdown on error.
 */

import { App, TFile } from "obsidian";

export interface ResolvedImageSource {
  file: TFile;
  /** Suggested filename for the upload — basename plus the original ext. */
  filename: string;
}

/**
 * Try to locate the image file referenced by `rawPath` inside the
 * vault. Returns the first match or throws.
 */
export async function resolveImageSource(
  app: App,
  rawPath: string,
): Promise<ResolvedImageSource> {
  const cleaned = cleanRawPath(rawPath);
  if (!cleaned) {
    throw new Error(`Empty image path`);
  }

  // Try the literal path first.
  const direct = app.vault.getAbstractFileByPath(cleaned);
  if (direct instanceof TFile) {
    return { file: direct, filename: direct.name };
  }

  // Wikilinks often omit the extension — try a small allowlist.
  const lower = cleaned.toLowerCase();
  const hasExt = /\.[a-z0-9]{2,5}$/.test(lower);
  if (!hasExt) {
    for (const ext of IMAGE_EXTS) {
      const candidate = `${cleaned}.${ext}`;
      const f = app.vault.getAbstractFileByPath(candidate);
      if (f instanceof TFile) {
        return { file: f, filename: f.name };
      }
    }
  }

  throw new Error(
    `Could not locate image in vault: ${rawPath}\n` +
      `(looked for "${cleaned}"${hasExt ? "" : " and " + IMAGE_EXTS.map((e) => `"${cleaned}.${e}"`).join(", ")})`,
  );
}

/**
 * Read the resolved image bytes into an ArrayBuffer for upload.
 */
export async function readImageBytes(app: App, file: TFile): Promise<ArrayBuffer> {
  return await app.vault.readBinary(file);
}

/**
 * Strip wikilink suffixes (`|300`, `|alt text`) and URL-decode.
 */
export function cleanRawPath(rawPath: string): string {
  let s = rawPath.trim();

  // Wikilink suffix: take everything before the first `|`.
  const pipeIdx = s.indexOf("|");
  if (pipeIdx >= 0) {
    s = s.substring(0, pipeIdx);
  }

  // Anchor / hash suffix (e.g. `#center` for wikilinks).
  const hashIdx = s.indexOf("#");
  if (hashIdx >= 0) {
    s = s.substring(0, hashIdx);
  }

  // URL decode — handles %20, %C3%A9, etc.
  try {
    s = decodeURI(s);
  } catch {
    // Malformed escape sequence; keep as-is and let vault lookup fail loudly.
  }

  // Strip a leading `./` (relative-to-current-note form).
  if (s.startsWith("./")) s = s.substring(2);
  // Collapse `../` chains — we only support vault-root-relative or
  // current-file-relative resolution paths; pure parent traversal would
  // need a base path which we don't always have.
  while (s.startsWith("../")) s = s.substring(3);

  return s;
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];