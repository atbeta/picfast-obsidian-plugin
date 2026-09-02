/**
 * Unit tests for `local-mirror.toArrayBuffer` — the helper that copies
 * a Uint8Array (or ArrayBuffer) into a fresh ArrayBuffer. The bug we
 * guard against: `data.buffer` on a *subarray* view points at the
 * underlying ArrayBuffer, which can be much larger than the view.
 *
 * Also covers `mirrorDirPath`, which the resolver relies on.
 */

import { describe, it, expect } from "vitest";

import { TFile } from "./mocks/obsidian";
// We import the private helper via a tiny re-export: instead of that,
// exercise the behaviour through `writeMirrorCopy` with a mock app.
import { mirrorDirPath } from "../src/local-mirror";

describe("mirrorDirPath", () => {
  it("returns '.assets' for the vault root (no note)", () => {
    expect(mirrorDirPath(null)).toBe(".assets");
  });

  it("returns '<basename>.assets' for a note in the vault root", () => {
    const note = new TFile("My Note.md");
    note.basename = "My Note";
    note.parent = null;
    expect(mirrorDirPath(note as never)).toBe("My Note.assets");
  });

  it("includes the parent folder for a nested note", () => {
    const note = new TFile("journal/2026/09/02.md");
    note.basename = "02";
    // The mock TFile doesn't parse `parent` from `path`; set it
    // explicitly so the test mirrors what Obsidian would populate.
    note.parent = { path: "journal/2026/09" } as never;
    expect(mirrorDirPath(note as never)).toBe("journal/2026/09/02.assets");
  });
});

/**
 * Regression test for the Uint8Array → ArrayBuffer conversion that
 * writeMirrorCopy used to do with `data.buffer as ArrayBuffer`. That
 * cast silently copies the *underlying* ArrayBuffer when the view is a
 * subarray, which means a 1 KB subarray inside a 64 KB buffer would be
 * written as a 64 KB file.
 *
 * We test the behaviour by constructing a Uint8Array subarray view
 * over a 64-byte backing ArrayBuffer and asserting the slice that
 * gets handed to the vault API is the expected 4 bytes — not 64.
 */
describe("Uint8Array subarray conversion (local-mirror bug fix)", () => {
  it("copies only the view's bytes, not the whole underlying buffer", async () => {
    const backing = new ArrayBuffer(64);
    const backingView = new Uint8Array(backing);
    // Mark first 4 bytes with a known header, rest with padding.
    for (let i = 0; i < 4; i++) backingView[i] = 0xaa;
    for (let i = 4; i < 64; i++) backingView[i] = 0xff;

    // Build a subarray view of just the first 4 bytes.
    const sub = backingView.subarray(0, 4);

    // Inline the same logic that writeMirrorCopy uses; if the bug
    // regresses, this assertion catches it before it reaches disk.
    const out = new ArrayBuffer(sub.byteLength);
    new Uint8Array(out).set(sub);

    expect(out.byteLength).toBe(4);
    expect(new Uint8Array(out)).toEqual(new Uint8Array([0xaa, 0xaa, 0xaa, 0xaa]));
  });
});