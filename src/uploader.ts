/**
 * Upload a single image to a PicFast instance via Obsidian's requestUrl
 * (which uses Node's net stack and sidesteps browser CORS).
 *
 * Uses POST /api/v1/flat/upload. The flat handler returns a flat JSON
 * shape `{ url, markdown, html, bbcode, thumbnail_url }` with no
 * `links` wrapper, which is simpler to consume.
 *
 * Multipart body is built by hand because Obsidian's `requestUrl.body`
 * only accepts `string | ArrayBuffer` — there is no automatic
 * FormData serialization, and a cast won't save us server-side
 * (server expects a real Content-Type + boundary header).
 */

import { requestUrl, RequestUrlParam } from "obsidian";

import { getUploadUrl, PicFastSettings } from "./settings";

export class PicFastUploadError extends Error {
  readonly httpStatus?: number;
  readonly serverMessage?: string;
  constructor(
    message: string,
    opts?: { httpStatus?: number; serverMessage?: string },
  ) {
    super(message);
    this.name = "PicFastUploadError";
    this.httpStatus = opts?.httpStatus;
    this.serverMessage = opts?.serverMessage;
  }
}

export interface UploadResult {
  /** Markdown link, e.g. `![](https://...)`. */
  markdown: string;
  /** Bare image URL. */
  url: string;
  /** Optional thumbnail URL. */
  thumbnailUrl?: string;
}

interface FlatServerResponse {
  url?: string;
  markdown?: string;
  html?: string;
  bbcode?: string;
  thumbnail_url?: string;
}

/**
 * Upload an `ArrayBuffer` / `Uint8Array` of image bytes under the given
 * filename. Returns the parsed response or throws a `PicFastUploadError`.
 */
export async function uploadImage(
  data: ArrayBuffer | Uint8Array,
  filename: string,
  settings: PicFastSettings,
): Promise<UploadResult> {
  if (!settings.baseUrl) {
    throw new PicFastUploadError(
      "PicFast base URL is not configured. Open Settings → PicFast and set it.",
    );
  }

  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data);

  const mimetype = guessMimeFromName(filename);
  const body = buildMultipartBody(bytes, filename, mimetype);

  const headers: Record<string, string> = {
    "Content-Type": `multipart/form-data; boundary=${BOUNDARY}`,
  };
  if (settings.apiToken) {
    headers["Authorization"] = `Bearer ${settings.apiToken}`;
  }

  const params: RequestUrlParam = {
    url: getUploadUrl(settings.baseUrl),
    method: "POST",
    body,
    headers,
    throw: false,
  };

  const response = await requestUrl(params);
  const status = response.status;
  const json = safeJson<FlatServerResponse>(response);

  if (status < 200 || status >= 300) {
    const msg =
      (json as unknown as { error?: string } | null)?.error ??
      response.text?.slice(0, 200) ??
      `HTTP ${status}`;
    throw new PicFastUploadError(`PicFast upload failed: ${msg}`, {
      httpStatus: status,
      serverMessage: msg,
    });
  }

  if (!json?.markdown || !json.url) {
    throw new PicFastUploadError(
      "PicFast response missing `markdown` / `url`. " +
        "Server may be on an older version (need 0.18+).",
    );
  }

  return {
    markdown: json.markdown,
    url: json.url,
    thumbnailUrl: json.thumbnail_url,
  };
}

// ---------------------------------------------------------------------------
// Multipart construction

// Same boundary for both header / footer so the body is a single buffer.
const BOUNDARY = "----PicFastObsidianPlugin" + Date.now().toString(36);

function buildMultipartBody(
  bytes: Uint8Array,
  filename: string,
  mimetype: string,
): ArrayBuffer {
  const encoder = new TextEncoder();
  const partHeader =
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${escapeFilename(filename)}"\r\n` +
    `Content-Type: ${mimetype}\r\n` +
    `\r\n`;
  const partFooter = `\r\n--${BOUNDARY}--\r\n`;

  const headerBytes = encoder.encode(partHeader);
  const footerBytes = encoder.encode(partFooter);

  const body = new Uint8Array(
    headerBytes.length + bytes.length + footerBytes.length,
  );
  body.set(headerBytes, 0);
  body.set(bytes, headerBytes.length);
  body.set(footerBytes, headerBytes.length + bytes.length);

  return body.buffer;
}

/**
 * Escape characters that would break a Content-Disposition header.
 * Filenames are user-controlled (clipboard / picker), so we need this
 * even though Obsidian usually picks tame names.
 */
function escapeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, (ch) => {
    switch (ch) {
      case "\r":
        return "%0D";
      case "\n":
        return "%0A";
      case '"':
        return "%22";
      case "\\":
        return "%5C";
      default:
        return ch;
    }
  });
}

function guessMimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    case "tif":
    case "tiff":
      return "image/tiff";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function safeJson<T>(res: { json?: unknown; text?: string }): T | null {
  if (res.json && typeof res.json === "object") return res.json as T;
  if (typeof res.text === "string" && res.text.length > 0) {
    try {
      return JSON.parse(res.text) as T;
    } catch {
      return null;
    }
  }
  return null;
}