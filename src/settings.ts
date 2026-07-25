/**
 * Plugin settings — types, defaults, load/save helpers.
 *
 * Only the four (now three) user-visible fields live here. The upload
 * path is hard-coded to /api/v1/flat/upload and the insert format is
 * always markdown — Obsidian is a markdown editor, no one picks "html"
 * or "bbcode" here.
 */

import { Plugin } from "obsidian";

export const CONFIG_SECTION = "picfast";
export const UPLOAD_PATH = "/api/v1/flat/upload";

/**
 * Upload behavior on paste / drop:
 *   - off:  handler is not registered; Obsidian default behaviour runs.
 *   - ask:  show a small menu ("Upload to PicFast" / "Save locally" / "Cancel").
 *   - on:   upload immediately, insert `![](url)`.
 */
export type UploadBehavior = "off" | "ask" | "on";

export interface PicFastSettings {
  baseUrl: string;
  apiToken: string;
  uploadBehavior: UploadBehavior;
  timeoutMs: number;
}

export const DEFAULT_SETTINGS: PicFastSettings = {
  baseUrl: "",
  apiToken: "",
  uploadBehavior: "ask",
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