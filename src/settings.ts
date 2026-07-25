/**
 * Plugin settings — types, defaults, load/save helpers.
 *
 * The four user-visible settings map 1:1 to the `PicFast` section in
 * Obsidian's Settings tab. All other config (request timeout, upload path)
 * is fixed at build time so users never have to think about it.
 */

import { Plugin } from "obsidian";

export const CONFIG_SECTION = "picfast";
export const UPLOAD_PATH = "/api/v1/upload";

/**
 * Upload behavior on paste / drop:
 *   - off:  handler is not registered; Obsidian default behaviour runs.
 *   - ask:  show a small menu ("Upload to PicFast" / "Save locally" / "Cancel").
 *   - on:   upload immediately, insert the returned markdown link.
 */
export type UploadBehavior = "off" | "ask" | "on";

export type InsertFormat = "url" | "markdown" | "html" | "bbcode";

export interface PicFastSettings {
  baseUrl: string;
  apiToken: string;
  uploadBehavior: UploadBehavior;
  defaultFormat: InsertFormat;
  timeoutMs: number;
}

export const DEFAULT_SETTINGS: PicFastSettings = {
  baseUrl: "",
  apiToken: "",
  uploadBehavior: "ask",
  defaultFormat: "markdown",
  timeoutMs: 30000,
};

export async function loadSettings(
  plugin: Plugin,
): Promise<PicFastSettings> {
  const raw = (await plugin.loadData()) ?? {};
  return {
    baseUrl: (raw.baseUrl ?? "").toString().trim(),
    apiToken: (raw.apiToken ?? "").toString().trim(),
    uploadBehavior: normalizeBehavior(raw.uploadBehavior),
    defaultFormat: normalizeFormat(raw.defaultFormat),
    timeoutMs: clampInt(raw.timeoutMs, 5000, 120000, 30000),
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

function normalizeBehavior(v: unknown): UploadBehavior {
  return v === "off" || v === "on" || v === "ask" ? v : "ask";
}

function normalizeFormat(v: unknown): InsertFormat {
  return v === "url" || v === "html" || v === "bbcode" || v === "markdown"
    ? v
    : "markdown";
}

function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof v === "number" ? Math.round(v) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}