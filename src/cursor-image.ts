/**
 * Locate an image link at the cursor position inside a markdown editor.
 *
 * Two syntaxes are recognised:
 *
 *   ![alt](path)        — standard markdown (2 capture groups: alt, path)
 *   ![[path]]           — Obsidian wikilink (1 capture group: path)
 *
 * The two regexes have *different* group layouts, so we walk them with
 * separate helpers rather than a single shared matcher that assumes a
 * uniform shape. (Previous bug: a shared helper read m[2] for both —
 * wikilinks only have m[1], so path came back as undefined and
 * isRemotePath(undefined) crashed with 'Cannot read properties of
 * undefined (reading "trim")'.)
 *
 * Returns null when the cursor is not inside an image link, or when the
 * link points at a remote URL (http/https, data:).
 */

import { Editor } from "obsidian";

export type ImageLinkType = "markdown" | "wikilink";

export interface ImageMatch {
  type: ImageLinkType;
  /** Full source range in editor coords — used for replaceRange(). */
  range: EditorRange;
  /** Raw path text inside `(...)` or after `[[`. Always a string. */
  rawPath: string;
  /** Alt text from markdown form; empty string for wikilinks. */
  alt: string;
}

interface EditorRange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
}

interface Hit {
  from: number;
  to: number;
  path: string;
  alt: string;
}

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKILINK_IMAGE_RE = /!\[\[([^\]]+)\]\]/g;

export function findImageAtCursor(editor: Editor): ImageMatch | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  if (!line) return null;

  // Markdown first — it's the more specific pattern (must start with `![`)
  // and we want to find `![alt](path)` even if `![[path]]` could also match.
  //
  // Strict-internal: cursor must be *inside* the link, not on the
  // opening `!` or closing `)`. This avoids firing the command while
  // the user is mid-typing the link itself.
  for (const m of matchMarkdown(line)) {
    if (cursor.ch > m.from && cursor.ch < m.to) {
      return {
        type: "markdown",
        range: {
          from: { line: cursor.line, ch: m.from },
          to: { line: cursor.line, ch: m.to },
        },
        rawPath: m.path,
        alt: m.alt,
      };
    }
  }

  for (const m of matchWikilink(line)) {
    if (cursor.ch > m.from && cursor.ch < m.to) {
      return {
        type: "wikilink",
        range: {
          from: { line: cursor.line, ch: m.from },
          to: { line: cursor.line, ch: m.to },
        },
        rawPath: m.path,
        alt: m.alt,
      };
    }
  }

  return null;
}

function matchMarkdown(line: string): Hit[] {
  const out: Hit[] = [];
  MARKDOWN_IMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKDOWN_IMAGE_RE.exec(line)) !== null) {
    // m[1] = alt, m[2] = path
    out.push({
      from: m.index,
      to: m.index + m[0].length,
      path: m[2],
      alt: m[1],
    });
    if (m.index === MARKDOWN_IMAGE_RE.lastIndex) {
      MARKDOWN_IMAGE_RE.lastIndex += 1; // defensive: zero-width match
    }
  }
  return out;
}

function matchWikilink(line: string): Hit[] {
  const out: Hit[] = [];
  WIKILINK_IMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_IMAGE_RE.exec(line)) !== null) {
    // m[1] = path. There's no alt-text capture group for wikilinks.
    out.push({
      from: m.index,
      to: m.index + m[0].length,
      path: m[1],
      alt: "",
    });
    if (m.index === WIKILINK_IMAGE_RE.lastIndex) {
      WIKILINK_IMAGE_RE.lastIndex += 1;
    }
  }
  return out;
}

/**
 * Cheap pre-check that doesn't depend on Obsidian's Editor — used by
 * `editorCheckCallback` so the command can hide itself when irrelevant.
 */
export function lineContainsImage(line: string): boolean {
  return /!\[/.test(line);
}

/**
 * Decide whether the given raw path is something we should treat as
 * "already remote" (skip — nothing to upload).
 */
export function isRemotePath(rawPath: string | undefined): boolean {
  if (typeof rawPath !== "string") return false;
  const trimmed = rawPath.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("mailto:")
  );
}