/**
 * Filename template engine.
 *
 * Renders a user-configurable pattern into an image filename. Supported
 * tokens (matching the paste-image-rename conventions where possible):
 *
 *   {{fileName}}       — active note's name without extension
 *   {{imageNameKey}}   — value of `imageNameKey` in the note's frontmatter
 *   {{DATE:$FORMAT}}   — moment.js format string, e.g. {{DATE:YYYYMMDD-HHmmss}}
 *   {{originalName}}   — original filename when one exists (paste from
 *                        file / drag), empty for clipboard screenshots
 *
 * Rendering never throws: unknown tokens are stripped, empty inputs
 * collapse, and the result is sanitized to be filesystem-safe.
 *
 * The empty pattern means "keep the original name" — callers treat that
 * as the zero-config default.
 */

export interface TemplateContext {
	/** Active note's basename without extension, e.g. `Weekly review`. */
	noteName?: string;
	/** `imageNameKey` frontmatter value for the active note. */
	imageNameKey?: string;
	/** Original filename with extension, e.g. `team-photo.jpg`. May be empty. */
	originalName?: string;
	/**
	 * Timestamp used for {{DATE:...}} tokens. Injectable so tests are
	 * deterministic; defaults to `Date.now()`.
	 */
	now?: Date;
}

/** Matches {{DATE:<format>}} where <format> has no braces. */
const DATE_TOKEN_RE = /\{\{DATE:([^}]+)\}\}/g;
/** Matches any {{...}} token so unknown ones can be stripped. */
const ANY_TOKEN_RE = /\{\{[^}]*\}\}/g;

export const DEFAULT_NAME_PATTERN = "{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}";

/**
 * Render `pattern` against `ctx` into a filename **without extension**.
 * Returns "" when the pattern yields nothing usable — the caller then
 * falls back to the original name.
 */
export function renderNamePattern(
	pattern: string,
	ctx: TemplateContext,
): string {
	const now = ctx.now ?? new Date();
	let out = pattern;

	// {{DATE:...}} first — it is the only token with an argument.
	out = out.replace(DATE_TOKEN_RE, (_m, fmt: string) => {
		try {
			return formatDate(new Date(now), fmt);
		} catch {
			return ""; // malformed format — strip silently
		}
	});

	// Plain tokens.
	out = out
		.replace(/\{\{\s*fileName\s*\}\}/g, ctx.noteName ?? "")
		.replace(/\{\{\s*imageNameKey\s*\}\}/g, ctx.imageNameKey ?? "")
		.replace(/\{\{\s*originalName\s*\}\}/g, stripExt(ctx.originalName ?? ""));

	// Strip unknown tokens so `{{bogus}}` never reaches the filesystem.
	out = out.replace(ANY_TOKEN_RE, "");

	return sanitizeBasename(out);
}

/**
 * Build the final upload filename for a source that should be renamed:
 * pattern rendered + extension preserved from the original (or a
 * sensible default for extension-less clipboard images).
 *
 * Returns null when the pattern is empty or renders to nothing — the
 * caller keeps the original filename in that case.
 */
export function buildRenamedFilename(
	pattern: string,
	ext: string,
	ctx: TemplateContext,
): string | null {
	if (!pattern || pattern.trim() === "") return null;
	const base = renderNamePattern(pattern, ctx);
	if (!base) return null;
	const safeExt = ext ? `.${ext.replace(/^\.+/, "")}` : "";
	return `${base}${safeExt}`;
}

// ---------------------------------------------------------------------------
// helpers

/**
 * Minimal moment-style date formatting. We only implement the tokens the
 * default pattern and common cases need; Obsidian bundles moment, but
 * tests run in bare node where it is absent, and this keeps the engine
 * dependency-free.
 */
export function formatDate(d: Date, fmt: string): string {
	const pad = (n: number, w = 2) => String(n).padStart(w, "0");
	return fmt
		.replace(/YYYY/g, String(d.getFullYear()))
		.replace(/YY/g, pad(d.getFullYear() % 100))
		.replace(/MM/g, pad(d.getMonth() + 1))
		.replace(/DD/g, pad(d.getDate()))
		.replace(/HH/g, pad(d.getHours()))
		.replace(/mm/g, pad(d.getMinutes()))
		.replace(/ss/g, pad(d.getSeconds()))
		.replace(/SSS/g, pad(d.getMilliseconds(), 3))
		.replace(/X/g, String(Math.floor(d.getTime() / 1000)));
}

/** Remove the extension from a filename (no-op when there is none). */
export function stripExt(name: string): string {
	const slash = Math.max(
		name.lastIndexOf("/"),
		name.lastIndexOf("\\"),
	);
	const base = slash >= 0 ? name.slice(slash + 1) : name;
	const dot = base.lastIndexOf(".");
	// dot > 0 keeps dotfiles like `.gitignore` intact.
	return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * Sanitize a rendered basename: strip path separators / control chars,
 * collapse whitespace, trim dots (Windows dislikes trailing dots),
 * collapse `-` runs left by stripped tokens, and cap the length so the
 * name stays readable.
 */
export function sanitizeBasename(name: string): string {
	const cleaned = name
		// control characters and path separators
		.replace(/[\u0000-\u001f\u007f[/\\]/g, "")
		// path-hostile punctuation on Windows
		.replace(/[<>:"|?*]/g, "")
		.replace(/\s+/g, " ")
		// hyphen runs left behind by stripped tokens: `img-{{bogus}}` → `img-`
		.replace(/-{2,}/g, "-")
		.replace(/^[.\s-]+|[.\s-]+$/g, "")
		.slice(0, 120)
		.trim();
	return cleaned;
}

/**
 * Deduplicate a filename against a set of already-used names by
 * appending `-2`, `-3`, … before the extension. Time-to-second patterns
 * collide when several screenshots land in the same second — that is
 * when the "necessary" ordinal appears.
 */
export function dedupeName(candidate: string, used: Set<string>): string {
	if (!used.has(candidate.toLowerCase())) return candidate;
	const dot = candidate.lastIndexOf(".");
	const cut = dot > 0 ? dot : candidate.length;
	const stem = candidate.slice(0, cut);
	const tail = candidate.slice(cut);
	let n = 2;
	while (used.has(`${stem}-${n}${tail}`.toLowerCase())) n++;
	return `${stem}-${n}${tail}`;
}
