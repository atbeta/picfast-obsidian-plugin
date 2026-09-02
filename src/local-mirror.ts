/**
 * Local mirror — keep a copy of uploaded images next to the note.
 *
 * Directory convention: `<note basename>.assets/` in the same folder as
 * the active note (the Typora convention). Files in the vault root use
 * `.assets/` directly. The remote link stays in the note — the mirror
 * copy is insurance for when the image host becomes unreachable.
 *
 * Failure semantics: mirror problems NEVER fail the upload — they are
 * logged and, for the fallback path, surfaced via a Notice by the caller.
 */

import { App, TFile } from "obsidian";

export interface MirrorResult {
	ok: boolean;
	/** Vault-relative path of the created file (when ok). */
	path?: string;
	error?: unknown;
}

/**
 * Write `data` as `<note>.assets/<filename>` next to `note`.
 * Creates the folder when missing. Existing files with the same name
 * are overwritten (same image re-uploaded → same mirror path).
 */
export async function writeMirrorCopy(
	app: App,
	note: TFile | null,
	filename: string,
	data: ArrayBuffer | Uint8Array,
): Promise<MirrorResult> {	try {
		const dirPath = mirrorDirPath(note);
		if (dirPath !== "/" && app.vault.getAbstractFileByPath(dirPath) === null) {
			await app.vault.createFolder(dirPath);
		}
		const filePath = joinVaultPath(dirPath, filename);
		const existing = app.vault.getAbstractFileByPath(filePath);
		const buffer = data instanceof Uint8Array ? data.buffer as ArrayBuffer : data;
		if (existing instanceof TFile) {
			await app.vault.modifyBinary(existing, buffer);
		} else {
			await app.vault.createBinary(filePath, buffer);
		}
		return { ok: true, path: filePath };
	} catch (error) {
		return { ok: false, error };
	}
}

/**
 * Directory that mirrors belong to for `note`: the note's parent folder
 * + `<basename>.assets`, or `.assets` in the vault root.
 */
export function mirrorDirPath(note: TFile | null): string {
	if (!note) return ".assets";
	const parent = note.parent?.path ?? "/";
	// Obsidian root folder reports path "/"; every other parent is a
	// relative path without a trailing slash.
	const base = parent === "/" ? "" : parent;
	return `${base}${base ? "/" : ""}${note.basename}.assets`;
}

function joinVaultPath(dir: string, filename: string): string {
	if (dir === "/" || dir === "") return filename;
	return `${dir}/${filename}`;
}
