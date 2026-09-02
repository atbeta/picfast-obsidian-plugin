/**
 * Plugin settings — types, defaults, load/save helpers.
 *
 * The upload path is hard-coded to /api/v1/flat/upload and the insert
 * format is always markdown — Obsidian is a markdown editor.
 */

import { Plugin } from "obsidian";

import { DEFAULT_NAME_PATTERN } from "./name-template";

export const CONFIG_SECTION = "picfast";
export const UPLOAD_PATH = "/api/v1/flat/upload";

/**
 * Upload behavior on paste / drop:
 *   - off:  handler is not registered; Obsidian default behaviour runs.
 *   - ask:  show a small menu ("Upload to PicFast" / "Save locally" / "Cancel").
 *   - on:   upload immediately, insert `![](url)`.
 */
export type UploadBehavior = "off" | "ask" | "on";

/**
 * Which sources the filename template applies to. Dragged files usually
 * carry a meaningful name; pasted screenshots never do — so "paste" is
 * the default.
 */
export type RenameScope = "paste" | "all";

export interface PicFastSettings {
  baseUrl: string;
  apiToken: string;
  uploadBehavior: UploadBehavior;
  /**
   * Filename template for renamed uploads. Empty string = keep the
   * original filename (zero-config default). See name-template.ts for
   * the supported tokens.
   */
  namePattern: string;
  renameScope: RenameScope;
  /**
   * Keep a local copy of every successfully uploaded image in
   * `<note>.assets/` next to the note (insurance against the image
   * host going away). Off by default.
   */
  localMirror: boolean;
}

export const DEFAULT_SETTINGS: PicFastSettings = {
  baseUrl: "",
  apiToken: "",
  uploadBehavior: "ask",
  namePattern: "",
  renameScope: "paste",
  localMirror: false,
};

export async function loadSettings(
  plugin: Plugin,
): Promise<PicFastSettings> {
  const raw = (await plugin.loadData()) ?? {};
  return {
    baseUrl: (raw.baseUrl ?? "").toString().trim(),
    apiToken: (raw.apiToken ?? "").toString().trim(),
    uploadBehavior: normalizeBehavior(raw.uploadBehavior),
    namePattern: (raw.namePattern ?? "").toString().trim(),
    renameScope: raw.renameScope === "all" ? "all" : "paste",
    localMirror: raw.localMirror === true,
  };
}

export async function saveSettings(
  plugin: Plugin,
  settings: PicFastSettings,
): Promise<void> {
  await plugin.saveData(settings);
}

export function getUploadUrl(baseUrl: string): string {
  return `${stripTrailingSlash(baseUrl)}${UPLOAD_PATH}`;
}

export function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** The pattern shown as the settings placeholder (not auto-applied). */
export function placeholderPattern(): string {
  return DEFAULT_NAME_PATTERN;
}

function normalizeBehavior(v: unknown): UploadBehavior {
  return v === "off" || v === "on" || v === "ask" ? v : "ask";
}
