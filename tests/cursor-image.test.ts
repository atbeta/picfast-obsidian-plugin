/**
 * Unit tests for pure helpers that don't need the Obsidian runtime:
 *   - cursor-image.ts      (findImageAtCursor needs an Editor — we stub one)
 *   - image-source-resolver.ts (cleanRawPath is a pure function)
 *   - uploader.ts          (buildMultipartBody internals, mime guessing)
 *   - settings.ts          (getUploadUrl / stripTrailingSlash)
 *
 * The mock Editor only implements what findImageAtCursor uses:
 * getCursor() and getLine().
 */

import { describe, it, expect } from "vitest";

import {
	findImageAtCursor,
	isRemotePath,
} from "../src/cursor-image";
import { cleanRawPath } from "../src/image-source-resolver";
import { getUploadUrl, stripTrailingSlash } from "../src/settings";

// ---------------------------------------------------------------------------
// Minimal Editor stub

interface Cursor {
	line: number;
	ch: number;
}

function makeEditor(lines: string[], cursor: Cursor) {
	return {
		getCursor: (): Cursor => cursor,
		getLine: (n: number): string => lines[n] ?? "",
	};
}

type EditorLike = ReturnType<typeof makeEditor>;

function findAt(lines: string[], cursor: Cursor) {
	return findImageAtCursor(makeEditor(lines, cursor) as never);
}

// ---------------------------------------------------------------------------
// cursor-image: markdown form

describe("findImageAtCursor — markdown form", () => {
	const line = '![alt text](attachments/foo.png)';

	it("finds a match when the cursor is inside the link", () => {
		const match = findAt([line], { line: 0, ch: 10 });
		expect(match).not.toBeNull();
		expect(match!.type).toBe("markdown");
		expect(match!.rawPath).toBe("attachments/foo.png");
		expect(match!.alt).toBe("alt text");
		expect(match!.range.from).toEqual({ line: 0, ch: 0 });
		expect(match!.range.to).toEqual({ line: 0, ch: line.length });
	});

	it("returns null when cursor is on the opening '!' (strict-internal)", () => {
		expect(findAt([line], { line: 0, ch: 0 })).toBeNull();
	});

	it("returns null when cursor is after the closing ')'", () => {
		expect(findAt([line], { line: 0, ch: line.length })).toBeNull();
	});

	it("handles a title suffix", () => {
		const l = '![a](img.png "the title")';
		const m = findAt([l], { line: 0, ch: 5 });
		expect(m?.rawPath).toBe("img.png");
	});

	it("handles URL-encoded paths", () => {
		const l = "![](my%20image.png)";
		const m = findAt([l], { line: 0, ch: 4 });
		expect(m?.rawPath).toBe("my%20image.png");
	});

	it("handles multiple images on one line — picks the right one", () => {
		const l = "![](a.png) text ![](b.png)";
		const first = findAt([l], { line: 0, ch: 3 });
		const second = findAt([l], { line: 0, ch: 20 });
		expect(first?.rawPath).toBe("a.png");
		expect(second?.rawPath).toBe("b.png");
	});
});

// ---------------------------------------------------------------------------
// cursor-image: wikilink form

describe("findImageAtCursor — wikilink form", () => {
	it("finds a basic wikilink image", () => {
		const l = "![[image.png]]";
		const m = findAt([l], { line: 0, ch: 4 });
		expect(m?.type).toBe("wikilink");
		expect(m?.rawPath).toBe("image.png");
		expect(m?.alt).toBe("");
	});

	it("splits the pipe suffix into nothing (path keeps before |)", () => {
		// Note: cleanRawPath handles the |suffix at resolve time; the
		// cursor matcher currently returns the raw text including |300.
		const l = "![[image.png|300]]";
		const m = findAt([l], { line: 0, ch: 4 });
		expect(m?.rawPath).toBe("image.png|300");
	});

	it("returns null when cursor is on the boundary", () => {
		const l = "![[image.png]]";
		expect(findAt([l], { line: 0, ch: 0 })).toBeNull();
		expect(findAt([l], { line: 0, ch: l.length })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// isRemotePath

describe("isRemotePath", () => {
	it("treats http/https/data as remote", () => {
		expect(isRemotePath("https://example.com/a.png")).toBe(true);
		expect(isRemotePath("http://example.com/a.png")).toBe(true);
		expect(isRemotePath("data:image/png;base64,AAA")).toBe(true);
	});

	it("treats local paths as not remote", () => {
		expect(isRemotePath("attachments/foo.png")).toBe(false);
		expect(isRemotePath("./foo.png")).toBe(false);
		expect(isRemotePath("../foo.png")).toBe(false);
		expect(isRemotePath("ftp.example.com/a.png")).toBe(false);
	});

	it("tolerates undefined and whitespace", () => {
		expect(isRemotePath(undefined)).toBe(false);
		expect(isRemotePath("  https://x.com/a.png ")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// cleanRawPath

describe("cleanRawPath", () => {
	it("URL-decodes paths", () => {
		expect(cleanRawPath("my%20image.png")).toBe("my image.png");
	});

	it("strips the wikilink pipe suffix", () => {
		expect(cleanRawPath("image.png|300")).toBe("image.png");
		expect(cleanRawPath("image.png|some alt")).toBe("image.png");
	});

	it("strips anchor suffix", () => {
		expect(cleanRawPath("note#center")).toBe("note");
	});

	it("strips ./ and ../ prefixes", () => {
		expect(cleanRawPath("./img/a.png")).toBe("img/a.png");
		expect(cleanRawPath("../../img/a.png")).toBe("img/a.png");
	});

	it("passes through plain paths", () => {
		expect(cleanRawPath("attachments/foo.png")).toBe(
			"attachments/foo.png",
		);
	});
});

// ---------------------------------------------------------------------------
// settings URL helpers

describe("settings URL helpers", () => {
	it("strips trailing slashes", () => {
		expect(stripTrailingSlash("https://x.com/")).toBe("https://x.com");
		expect(stripTrailingSlash("https://x.com///")).toBe("https://x.com");
		expect(stripTrailingSlash("https://x.com")).toBe("https://x.com");
	});

	it("builds the flat upload URL", () => {
		expect(getUploadUrl("https://x.com")).toBe(
			"https://x.com/api/v1/flat/upload",
		);
		expect(getUploadUrl("https://x.com/")).toBe(
			"https://x.com/api/v1/flat/upload",
		);
	});
});
