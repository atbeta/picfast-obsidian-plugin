/**
 * Auto-discover the PicFast CLI config (~/.config/picfast/config.json
 * on Linux, ~/Library/Application Support/picfast/config.json on macOS,
 * %APPDATA%\picfast\config.json on Windows) so the user doesn't have to
 * fill in `baseUrl` / `apiToken` twice. Honours PICFAST_URL /
 * PICFAST_TOKEN env vars first, then the config file.
 *
 * Returns only the fields that are missing from the current settings —
 * existing user input always wins.
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs";

import { PicFastSettings } from "./settings";

const ENV_URL = "PICFAST_URL";
const ENV_TOKEN = "PICFAST_TOKEN";

export interface CliConfig {
  url?: string;
  token?: string;
}

/**
 * Resolve the absolute path to `picfast/config.json` under the user's
 * config dir for the current platform. Returns `null` if the platform
 * is unsupported (Obsidian on iOS / Android do not expose Node fs).
 */
export function getCliConfigPath(): string | null {
  const home = os.homedir?.();
  if (!home) return null;

  const platform = process.platform;
  if (platform === "linux") {
    // honour XDG_CONFIG_HOME if set
    const xdg = process.env.XDG_CONFIG_HOME;
    if (xdg && xdg.length > 0) {
      return path.join(xdg, "picfast", "config.json");
    }
    return path.join(home, ".config", "picfast", "config.json");
  }
  if (platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "picfast",
      "config.json",
    );
  }
  if (platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata && appdata.length > 0) {
      return path.join(appdata, "picfast", "config.json");
    }
    return path.join(home, "AppData", "Roaming", "picfast", "config.json");
  }
  return null;
}

/**
 * Read the CLI config file. Returns `null` if the file is missing or
 * malformed — never throws into the calling plugin.
 */
export async function readCliConfig(): Promise<CliConfig | null> {
  const configPath = getCliConfigPath();
  if (!configPath) return null;

  try {
    // Obsidian's Node integration exposes `fs` lazily; check synchronously
    // because this runs once at startup.
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: CliConfig = {};
    if (typeof parsed.url === "string" && parsed.url.length > 0) {
      out.url = parsed.url;
    }
    if (typeof parsed.token === "string" && parsed.token.length > 0) {
      out.token = parsed.token;
    }
    return out;
  } catch (err) {
    // File present but unreadable / unparseable — surface in Notice, don't throw.
    // eslint-disable-next-line no-console
    console.warn(
      "[PicFast] failed to read CLI config:",
      configPath,
      err,
    );
    return null;
  }
}

export interface AutoPopulateResult {
  settings: PicFastSettings;
  populated: Array<"baseUrl" | "apiToken">;
}

/**
 * Layer the auto-discovered config over `current` without overwriting
 * any field the user has already filled in. Order of precedence:
 *
 *   1. existing `current` setting  (user typed it in the Settings tab)
 *   2. environment variable        (PICFAST_URL / PICFAST_TOKEN)
 *   3. CLI config file             (~/.config/picfast/config.json)
 */
export async function autoPopulateSettings(
  current: PicFastSettings,
): Promise<AutoPopulateResult> {
  const envUrl = (process.env[ENV_URL] ?? "").trim();
  const envToken = (process.env[ENV_TOKEN] ?? "").trim();
  const cli = await readCliConfig();

  const populated: Array<"baseUrl" | "apiToken"> = [];
  const out: PicFastSettings = { ...current };

  if (out.baseUrl === "" && (envUrl || cli?.url)) {
    out.baseUrl = (envUrl || cli?.url || "").trim();
    populated.push("baseUrl");
  }
  if (out.apiToken === "" && (envToken || cli?.token)) {
    out.apiToken = (envToken || cli?.token || "").trim();
    populated.push("apiToken");
  }

  return { settings: out, populated };
}