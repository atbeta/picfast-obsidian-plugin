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
 *   - All Obsidian-resolved locations: the user-configured attachment
 *     folder, "in subfolder under current file" `<note>.assets/`,
 *     aliases, and vault-relative paths.
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
 *
 * Resolution order:
 *   1. `metadataCache.getFirstLinkpathDest(cleaned, sourcePath)` —
 *      Obsidian's own resolver. Knows about the user's attachment
 *      folder setting, the "<note>.assets/" placement, and relative
 *      paths against the source note. This is the only resolver that
 *      tracks Obsidian's own link rules, so we delegate to it instead
 *      of duplicating them here.
 *   2. `vault.getAbstractFileByPath(cleaned)` — explicit vault-relative
 *      paths (e.g. `attachments/foo.png`) that the resolver above
 *      somehow missed.
 *   3. Extension allowlist (`png`, `jpg`, …) — wikilinks often drop
 *      the extension; we try both resolvers again with each suffix.
 *
 * `activeFile` is the note the cursor sits in (used as `sourcePath`
 * for the resolver). When it is null/undefined we pass an empty path,
 * which Obsidian treats as "relative to the vault root".
 */
export async function resolveImageSource(
  app: App,
  rawPath: string,
  activeFile?: TFile | null,
): Promise<ResolvedImageSource> {
  const cleaned = cleanRawPath(rawPath);
  if (!cleaned) {
    throw new Error(`Empty image path`);
  }

  const sourcePath = activeFile?.path ?? "";
  const candidates = expandCandidates(cleaned);

  for (const candidate of candidates) {
    const hit = resolveOne(app, candidate, sourcePath);
    if (hit) return { file: hit, filename: hit.name };
  }

  throw new Error(
    `Could not locate image in vault: ${rawPath}\n` +
      `(looked for ${candidates.map((c) => `"${c}"`).join(", ")})`,
  );
}

/**
 * Resolve one `linkpath` candidate through every resolver we have. The
 * Obsidian resolver wins when it returns a `TFile` (it considers more
 * contexts than the vault-root lookup); otherwise we fall back to a
 * direct vault lookup so explicit paths like `attachments/foo.png`
 * still work even when Obsidian's resolver refuses them.
 */
function resolveOne(
  app: App,
  candidate: string,
  sourcePath: string,
): TFile | null {
  try {
    const viaCache = app.metadataCache.getFirstLinkpathDest(
      candidate,
      sourcePath,
    );
    if (viaCache instanceof TFile) return viaCache;
  } catch {
    // metadataCache can throw on path traversal edge cases; fall
    // through to the vault lookup rather than failing the whole chain.
  }
  const viaVault = app.vault.getAbstractFileByPath(candidate);
  if (viaVault instanceof TFile) return viaVault;
  return null;
}

/**
 * For a cleaned `linkpath`, return the list of strings we should try
 * resolving it as. The first entry is the input itself; if it lacks an
 * extension we append the `IMAGE_EXTS` allowlist.
 */
function expandCandidates(cleaned: string): string[] {
  const lower = cleaned.toLowerCase();
  const hasExt = /\.[a-z0-9]{2,5}$/.test(lower);
  if (hasExt) return [cleaned];
  return [cleaned, ...IMAGE_EXTS.map((ext) => `${cleaned}.${ext}`)];
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
  // Collapse `../` chains — `getFirstLinkpathDest` handles parent
  // traversal relative to the source path, so a bare leading `../`
  // without a base is meaningless.
  while (s.startsWith("../")) s = s.substring(3);

  return s;
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];