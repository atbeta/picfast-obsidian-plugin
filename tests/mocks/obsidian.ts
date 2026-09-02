/**
 * Minimal runtime stub for the `obsidian` module, used only by Vitest.
 * The real `obsidian` package ships types only (the API is provided by
 * the app at runtime), so tests that import plugin modules which
 * `import { TFile } from "obsidian"` need this to resolve.
 */

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	// `parent` is `TFolder | null` in the real API; tests cast as needed.
	parent: unknown;
	constructor(path = "") {
		this.path = path;
		this.name = path.split("/").pop() ?? "";
		const dot = this.name.lastIndexOf(".");
		this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
		this.extension = dot > 0 ? this.name.slice(dot + 1) : "";
		this.parent = null;
	}
}

export class TFolder {}

export class Notice {
	constructor(public message?: string, public timeout?: number) {}
}

export class Menu {
	addItem(_cb: (item: unknown) => unknown): this {
		return this;
	}
}

export class PluginSettingTab {}

export class Plugin {}

/**
 * Test-only metadataCache stub. `getFirstLinkpathDest` mirrors Obsidian's
 * contract for the cases the resolver cares about — bare filenames are
 * looked up against (a) the vault root, (b) a `<source>.assets/` folder
 * next to the source path, and (c) explicit subpaths. Tests can set
 * `files` to seed the vault.
 */
export const metadataCache = {
	/**
	 * Lookup table the tests fill in: `linkpath.toLowerCase()` and
	 * `<sourceDir>/<linkpath>`-style keys both resolve to a TFile.
	 */
	files: new Map<string, TFile>(),
	/**
	 * Optional override for the "user-configured attachment folder".
	 * Tests set this to simulate `Settings → Files & Links → Default
	 * location for new attachments`. When empty, the resolver behaves
	 * as if attachments land in the vault root.
	 */
	attachmentFolder: "",
	getFirstLinkpathDest(
		linkpath: string,
		sourcePath: string,
	): TFile | null {
		const lp = linkpath.toLowerCase();
		if (this.files.has(lp)) return this.files.get(lp)!;

		// <source>.assets/<linkpath>
		if (sourcePath) {
			const parts = sourcePath.split("/");
			const stem = parts.pop()?.replace(/\.md$/, "") ?? "";
			const dir = parts.join("/");
			const mirror = (dir ? `${dir}/` : "") + `${stem}.assets/${linkpath}`;
			const byMirror = this.files.get(mirror.toLowerCase());
			if (byMirror) return byMirror;
		}

		// Configured attachment folder (vault-root or subfolder)
		if (this.attachmentFolder) {
			const sub = (
 this.attachmentFolder === "."
					? ""
					: this.attachmentFolder + "/"
			) + linkpath;
			const byAtt = this.files.get(sub.toLowerCase());
			if (byAtt) return byAtt;
		}

		return null;
	},
};

export async function requestUrl() {
	throw new Error("requestUrl stub — not available in tests");
}

export class MarkdownView {}
