/**
 * Read small bits of the active note's frontmatter used by the upload
 * flow (currently just `imageNameKey` for the filename template).
 *
 * Kept in its own module so every upload entry point can call it
 * without copying the try/catch + metadataCache dance.
 */

import { App } from "obsidian";

/**
 * Read `imageNameKey` from the active note's frontmatter. Returns "" when
 * the active file is missing, the metadata cache can't produce a cache
 * entry, or the frontmatter value is not a string.
 *
 * All failures are swallowed and reported as "" — the filename template
 * treats an empty token the same as an absent one, and surfacing an
 * error here would block uploads for users without an `imageNameKey`
 * frontmatter key.
 */
export function readImageNameKey(app: App): string {
	try {
		const file = app.workspace.getActiveFile();
		if (!file) return "";
		const meta = app.metadataCache.getFileCache(file);
		const value = meta?.frontmatter?.["imageNameKey"];
		return typeof value === "string" ? value.trim() : "";
	} catch {
		return "";
	}
}