/**
 * Minimal runtime stub for the `obsidian` module, used only by Vitest.
 * The real `obsidian` package ships types only (the API is provided by
 * the app at runtime), so tests that import plugin modules which
 * `import { TFile } from "obsidian"` need this to resolve.
 */

export class TFile {
	path: string;
	name: string;
	extension: string;
	constructor(path = "") {
		this.path = path;
		this.name = path.split("/").pop() ?? "";
		this.extension = this.name.includes(".")
			? this.name.split(".").pop()!
			: "";
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

export async function requestUrl() {
	throw new Error("requestUrl stub — not available in tests");
}

export class MarkdownView {}
