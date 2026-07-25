/**
 * Locate an image link at the cursor position inside a markdown editor.
 *
 * Two syntaxes are recognised:
 *
 *   ![alt](path)        — standard markdown
 *   ![[path]]           — Obsidian wikilink (this is the dominant form
 *                          for images embedded from the vault)
 *
 * Returns null when the cursor is not inside an image link, or when the
 * link points at a remote URL (http/https, data:). Both cases should
 * leave the existing paste/drop handlers alone.
 */

import { Editor } from "obsidian";

export type ImageLinkType = "markdown" | "wikilink";

export interface ImageMatch {
  type: ImageLinkType;
  /** Full source range in editor coords — used for replaceRange(). */
  range: EditorRange;
  /** Raw path text inside `(...)` or after `[[`. */
  rawPath: string;
  /** Alt text from markdown form; null for wikilink. */
  alt: string | null;
}

interface EditorRange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
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
  for (const m of matchAll(MARKDOWN_IMAGE_RE, line)) {
    if (cursor.ch > m.from && cursor.ch < m.to) {
      return {
        type: "markdown",
        range: {
          from: { line: cursor.line, ch: m.from },
          to: { line: cursor.line, ch: m.to },
        },
        rawPath: m.path,
        alt: m.alt || null,
      };
    }
  }

  for (const m of matchAll(WIKILINK_IMAGE_RE, line)) {
    if (cursor.ch > m.from && cursor.ch < m.to) {
      return {
        type: "wikilink",
        range: {
          from: { line: cursor.line, ch: m.from },
          to: { line: cursor.line, ch: m.to },
        },
        rawPath: m.path,
        alt: null,
      };
    }
  }

  return null;
}

interface Match {
  from: number;
  to: number;
  path: string;
  alt: string;
}

function matchAll(re: RegExp, line: string): Match[] {
  const out: Match[] = [];
  // Reset to avoid statefulness across calls.
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    out.push({
      from: m.index,
      to: m.index + m[0].length,
      path: m[2],
      alt: m[1],
    });
    if (m.index === re.lastIndex) {
      // Defensive: zero-width match would infinite-loop.
      re.lastIndex += 1;
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
export function isRemotePath(rawPath: string): boolean {
  const trimmed = rawPath.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("mailto:")
  );
}