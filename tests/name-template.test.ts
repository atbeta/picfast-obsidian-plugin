import { describe, it, expect } from "vitest";

import {
	buildRenamedFilename,
	dedupeName,
	formatDate,
	renderNamePattern,
	sanitizeBasename,
	stripExt,
} from "../src/name-template";

// 2026-09-02 15:43:00.123 local time — fixed for deterministic tests.
const NOW = new Date(2026, 8, 2, 15, 43, 0, 123);

const CTX = {
	noteName: "周报评审",
	imageNameKey: "",
	originalName: "",
	now: NOW,
};

describe("renderNamePattern", () => {
	it("renders the default pattern", () => {
		expect(renderNamePattern("{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}", CTX)).toBe(
			"周报评审-20260902-154300",
		);
	});

	it("renders imageNameKey", () => {
		expect(
			renderNamePattern("{{imageNameKey}}-{{DATE:YYYYMMDD}}", {
				...CTX,
				imageNameKey: "my-blog",
			}),
		).toBe("my-blog-20260902");
	});

	it("renders originalName without extension", () => {
		expect(
			renderNamePattern("{{originalName}}", {
				...CTX,
				originalName: "team photo.jpg",
			}),
		).toBe("team photo");
	});

	it("strips unknown tokens", () => {
		expect(renderNamePattern("img-{{bogus}}-{{DATE:DD}}", CTX)).toBe("img-02");
	});

	it("collapses when everything is empty", () => {
		expect(renderNamePattern("{{imageNameKey}}", CTX)).toBe("");
	});

	it("sanitizes hostile characters", () => {
		expect(
			renderNamePattern("{{fileName}}", {
				...CTX,
				noteName: 'a/b<c>:d"e|f?g*h',
			}),
		).toBe("abcdefgh");
	});

	it("trims dots and spaces (Windows-hostile tails)", () => {
		expect(
			renderNamePattern("{{fileName}}", { ...CTX, noteName: "  note. " }),
		).toBe("note");
	});
});

describe("buildRenamedFilename", () => {
	it("returns null for an empty pattern (keep original name)", () => {
		expect(buildRenamedFilename("", "png", CTX)).toBeNull();
		expect(buildRenamedFilename("   ", "png", CTX)).toBeNull();
	});

	it("appends the extension", () => {
		expect(
			buildRenamedFilename("{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}", "png", CTX),
		).toBe("周报评审-20260902-154300.png");
	});

	it("returns null when the pattern renders empty", () => {
		expect(buildRenamedFilename("{{imageNameKey}}", "png", CTX)).toBeNull();
	});

	it("handles extension-less originals", () => {
		expect(
			buildRenamedFilename("shot-{{DATE:HHmmss}}", "", CTX),
		).toBe("shot-154300");
	});
});

describe("formatDate", () => {
	it("supports common moment-style tokens", () => {
		expect(formatDate(NOW, "YYYY-MM-DD HH:mm:ss")).toBe("2026-09-02 15:43:00");
		expect(formatDate(NOW, "YYYYMMDD-HHmmss")).toBe("20260902-154300");
		expect(formatDate(NOW, "YY/MM/DD")).toBe("26/09/02");
		expect(formatDate(NOW, "SSS")).toBe("123");
	});
});

describe("stripExt", () => {
	it("strips simple extensions", () => {
		expect(stripExt("photo.png")).toBe("photo");
	});
	it("keeps dotfiles intact", () => {
		expect(stripExt(".gitignore")).toBe(".gitignore");
	});
	it("handles paths", () => {
		expect(stripExt("a/b/photo.png")).toBe("photo");
		expect(stripExt("a\\b\\photo.png")).toBe("photo");
	});
});

describe("sanitizeBasename", () => {
	it("removes path separators", () => {
		expect(sanitizeBasename("a/b\\c")).toBe("abc");
	});
	it("caps length", () => {
		expect(sanitizeBasename("x".repeat(200)).length).toBe(120);
	});
});

describe("dedupeName", () => {
	it("passes through unique names", () => {
		expect(dedupeName("a.png", new Set())).toBe("a.png");
	});

	it("appends -2 for the first collision", () => {
		const used = new Set(["a.png"]);
		expect(dedupeName("a.png", used)).toBe("a-2.png");
	});

	it("increments -3, -4 …", () => {
		const used = new Set(["a.png", "a-2.png", "a-3.png"]);
		expect(dedupeName("a.png", used)).toBe("a-4.png");
	});

	it("is case-insensitive", () => {
		const used = new Set(["note-1.png"]);
		expect(dedupeName("NOTE-1.PNG", used)).toBe("NOTE-1-2.PNG");
	});

	it("handles extension-less names", () => {
		const used = new Set(["shot"]);
		expect(dedupeName("shot", used)).toBe("shot-2");
	});
});

describe("same-second collision (the ordinal use case)", () => {
	it("two screenshots in the same second get distinct names", () => {
		const pattern = "{{fileName}}-{{DATE:YYYYMMDD-HHmmss}}";
		const used = new Set<string>();
		const first = buildRenamedFilename(pattern, "png", CTX)!;
		const final1 = dedupeName(first, used);
		used.add(final1.toLowerCase());
		const second = dedupeName(first, used);
		expect(final1).toBe("周报评审-20260902-154300.png");
		expect(second).toBe("周报评审-20260902-154300-2.png");
	});
});
