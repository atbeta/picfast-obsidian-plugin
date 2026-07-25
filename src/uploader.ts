/**
 * Upload a single image to a PicFast instance via Obsidian's requestUrl
 * (which uses Node's net stack and sidesteps browser CORS).
 *
 * The server returns the full `imageResponse` shape (see
 * picfast/internal/handler/dto.go): we only need `links.markdown` for
 * insertion; everything else is ignored.
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
  /** `links.markdown` from the server response, e.g. `![](https://...)`. */
  markdown: string;
  /** `links.url` for callers that want the bare URL. */
  url: string;
  /** `links.thumbnail_url` when available. */
  thumbnailUrl?: string;
  /** Server-assigned mime, useful for diagnostics. */
  mimetype: string;
}

interface ServerImageResponse {
  links?: {
    markdown?: string;
    url?: string;
    thumbnail_url?: string;
  };
  mimetype?: string;
}

/**
 * Upload an `ArrayBuffer` (or `Uint8Array`) of image bytes under the given
 * filename. Resolves with the upload result or rejects with a
 * PicFastUploadError describing the failure.
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
    data instanceof Uint8Array
      ? new Uint8Array(data)
      : new Uint8Array(data);

  const blob = new Blob([bytes], {
    type: guessMimeFromName(filename),
  });
  const form = new FormData();
  form.append("file", blob, filename);

  const headers: Record<string, string> = {};
  if (settings.apiToken) {
    headers["Authorization"] = `Bearer ${settings.apiToken}`;
  }

  const params = {
    url: getUploadUrl(settings.baseUrl),
    method: "POST",
    body: form as unknown as ArrayBuffer,
    headers,
    throw: false,
  } as unknown as RequestUrlParam;

  const response = await requestUrl(params);
  const status = response.status;
  const json = safeJson<ServerImageResponse>(response);

  if (status < 200 || status >= 300) {
    const msg =
      json && typeof (json as unknown as { error?: string }).error === "string"
        ? (json as unknown as { error: string }).error
        : `${status} ${response.text?.slice(0, 200) ?? ""}`;
    throw new PicFastUploadError(`PicFast upload failed: ${msg}`, {
      httpStatus: status,
      serverMessage: msg,
    });
  }

  const links = json?.links;
  if (!links?.markdown || !links.url) {
    throw new PicFastUploadError(
      "PicFast response missing `links.markdown` / `links.url`. " +
        "Server may be on an older version (need 0.18+).",
    );
  }

  return {
    markdown: links.markdown,
    url: links.url,
    thumbnailUrl: links.thumbnail_url,
    mimetype: json?.mimetype ?? guessMimeFromName(filename),
  };
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