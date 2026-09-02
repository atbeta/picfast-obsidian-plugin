/**
 * Tests for `resolveImageSource`. The resolver delegates to Obsidian's
 * own `metadataCache.getFirstLinkpathDest` for the primary lookup so
 * that the user's actual "Default location for new attachments" setting
 * (vault root / `attachments/` / "In subfolder under current file")
 * is honoured without us hardcoding paths.
 *
 * Tests use a stub `metadataCache` from `tests/mocks/obsidian.ts`.
 */

import { beforeEach, describe, it, expect } from "vitest";

import { TFile, metadataCache } from "./mocks/obsidian";
import { resolveImageSource } from "../src/image-source-resolver";

function fileWith(path: string): TFile {
	const f = new TFile(path);
	f.basename = path.split("/").pop()!.replace(/\.[^.]+$/, "");
	f.parent = null;
	metadataCache.files.set(path.toLowerCase(), f);
	return f;
}

function makeApp() {
	return {
		vault: {
			getAbstractFileByPath: (p: string) =>
				metadataCache.files.get(p.toLowerCase()) ?? null,
		},
		metadataCache,
	};
}

beforeEach(() => {
	metadataCache.files.clear();
	metadataCache.attachmentFolder = "";
});

describe("resolveImageSource — direct vault paths", () => {
	it("finds a file in the vault root", async () => {
		const foo = fileWith("foo.png");
		const r = await resolveImageSource(makeApp(), "foo.png", null);
		expect(r.file).toBe(foo);
	});

	it("finds a file in a vault subfolder by its full path", async () => {
		const img = fileWith("attachments/photo.png");
		const r = await resolveImageSource(makeApp(), "attachments/photo.png", null);
		expect(r.file).toBe(img);
	});

	it("URL-decodes %20 before resolving", async () => {
		const f = fileWith("AI Sampling.png");
		const r = await resolveImageSource(makeApp(), "AI%20Sampling.png", null);
		expect(r.file).toBe(f);
	});

	it("strips a wikilink pipe suffix and resolves the bare path", async () => {
		const f = fileWith("attachments/photo.png");
		const r = await resolveImageSource(makeApp(), "attachments/photo.png|300", null);
		expect(r.file).toBe(f);
	});

	it("strips an anchor suffix", async () => {
		const f = fileWith("note.png");
		const r = await resolveImageSource(makeApp(), "note.png#center", null);
		expect(r.file).toBe(f);
	});
});

describe("resolveImageSource — attachment folder config", () => {
	it("finds a file in the user's configured attachment folder", async () => {
		metadataCache.attachmentFolder = "attachments";
		const img = fileWith("attachments/photo.png");
		const active = new TFile("notes/2026/09/02.md");
		active.basename = "02";
		active.parent = { path: "notes/2026/09" } as never;
		const r = await resolveImageSource(makeApp(), "photo.png", active);
		expect(r.file).toBe(img);
	});

	it("attachment folder '.' (vault root) still works", async () => {
		metadataCache.attachmentFolder = ".";
		const foo = fileWith("photo.png");
		const active = new TFile("notes/02.md");
		active.basename = "02";
		const r = await resolveImageSource(makeApp(), "photo.png", active);
		expect(r.file).toBe(foo);
	});
});

describe("resolveImageSource — <note>.assets/ fallback", () => {
	function activeNote() {
		const note = new TFile("notes/2026/09/02.md");
		note.basename = "02";
		note.parent = { path: "notes/2026/09" } as never;
		return note;
	}

	it("finds a bare filename in <note>.assets/ (Obsidian's in-subfolder mode)", async () => {
		const note = activeNote();
		const mirror = fileWith("notes/2026/09/02.assets/photo.png");
		const r = await resolveImageSource(makeApp(), "photo.png", note);
		expect(r.file).toBe(mirror);
	});

	it("URL-decodes %20 before falling back to <note>.assets/", async () => {
		const note = activeNote();
		const mirror = fileWith(
			"notes/2026/09/02.assets/AI Sampling.png",
		);
		const r = await resolveImageSource(makeApp(), "AI%20Sampling.png", note);
		expect(r.file).toBe(mirror);
	});
});

describe("resolveImageSource — extension-less linkpaths", () => {
	it("walks the IMAGE_EXTS allowlist", async () => {
		const png = fileWith("note.png");
		const r = await resolveImageSource(makeApp(), "note", null);
		expect(r.file).toBe(png);
	});

	it("picks .jpg before .png when .png is absent", async () => {
		const jpg = fileWith("note.jpg");
		const r = await resolveImageSource(makeApp(), "note", null);
		expect(r.file).toBe(jpg);
	});
});

describe("resolveImageSource — failure modes", () => {
	it("throws 'Could not locate' when the file is genuinely missing", async () => {
		await expect(
			resolveImageSource(makeApp(), "missing.png", null),
		).rejects.toThrow(/Could not locate image in vault/);
	});

	it("lists every candidate it tried in the error message", async () => {
		try {
			await resolveImageSource(makeApp(), "missing", null);
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("missing");
			expect(msg).toContain("missing.png");
		}
	});
});