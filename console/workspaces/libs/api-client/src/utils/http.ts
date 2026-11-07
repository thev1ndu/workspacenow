import { mockServer } from "@workspacenow/mock-server";
import { ApiError, globalConfig, type ApiErrorBody } from "@workspacenow/types";

export const SERVICE_BASE = "/api/v1";

interface RequestOptions {
  token?: string;
  searchParams?: Record<string, string | undefined>;
  body?: unknown;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends to the platform at apiBaseUrl when configured, otherwise to the in-browser demo platform.
async function request<T>(method: string, url: string, { token, searchParams, body }: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  if (globalConfig.apiBaseUrl) return fetchJSON<T>(method, url, query, token, body);
  await wait(globalConfig.mockLatencyMs);
  const response = mockServer({
    method,
    path: url.startsWith(SERVICE_BASE) ? url.slice(SERVICE_BASE.length) : url,
    query,
    // Round-trip through JSON so callers never share objects with the runtime's state.
    body: body === undefined ? undefined : JSON.parse(JSON.stringify(body)),
    token,
  });
  const payload = response.body === undefined ? undefined : JSON.parse(JSON.stringify(response.body));
  if (response.status >= 400) throw new ApiError(payload as ApiErrorBody);
  return payload as T;
}

async function fetchJSON<T>(method: string, url: string, query: URLSearchParams, token: string | undefined, body: unknown): Promise<T> {
  const search = query.size ? `?${query}` : "";
  let response: Response;
  try {
    response = await fetch(`${globalConfig.apiBaseUrl.replace(/\/+$/, "")}${url}${search}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ status: 0, code: "INVALID_STATE", message: "Can't reach the WorkspaceNow platform. Check your connection and try again." });
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new ApiError(
      payload && typeof payload.message === "string"
        ? (payload as ApiErrorBody)
        : { status: response.status, code: "INVALID_STATE", message: `The platform answered ${response.status}.` },
    );
  }
  return payload as T;
}

export interface RawResponse {
  status: number;
  contentType: string;
  bytes: Uint8Array;
  body: unknown;
}

// requestRaw is for non-JSON payloads (file upload/download). In demo mode the bytes cross as base64.
export async function requestRaw(method: string, url: string, options: RequestOptions & { rawBody?: Uint8Array } = {}): Promise<RawResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  if (globalConfig.apiBaseUrl) {
    const response = await fetch(`${globalConfig.apiBaseUrl.replace(/\/+$/, "")}${url}${query.size ? `?${query}` : ""}`, {
      method,
      headers: {
        ...(options.rawBody ? { "Content-Type": "application/octet-stream" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.rawBody as BodyInit | undefined,
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      /* binary */
    }
    return { status: response.status, contentType: response.headers.get("Content-Type") ?? "", bytes, body };
  }
  await wait(globalConfig.mockLatencyMs);
  const response = mockServer({
    method,
    path: url.startsWith(SERVICE_BASE) ? url.slice(SERVICE_BASE.length) : url,
    query,
    body: options.rawBody ? { __rawBase64: btoa(String.fromCharCode(...options.rawBody)) } : options.body,
    token: options.token,
  });
  const payload = response.body as { __fileBase64?: string; contentType?: string; name?: string } | undefined;
  if (payload && typeof payload.__fileBase64 === "string") {
    const bin = atob(payload.__fileBase64);
    return {
      status: response.status,
      contentType: payload.contentType ?? "application/octet-stream",
      bytes: Uint8Array.from(bin, (c) => c.charCodeAt(0)),
      body: payload,
    };
  }
  const text = payload === undefined ? "" : JSON.stringify(payload);
  return {
    status: response.status,
    contentType: "application/json",
    bytes: new TextEncoder().encode(text),
    body: payload,
  };
}

export const httpGET =<T>(url: string, options?: RequestOptions) => request<T>("GET", url, options);
export const httpPOST = <T>(url: string, options?: RequestOptions) => request<T>("POST", url, options);
export const httpPATCH = <T>(url: string, options?: RequestOptions) => request<T>("PATCH", url, options);
export const httpPUT = <T>(url: string, options?: RequestOptions) => request<T>("PUT", url, options);
export const httpDELETE = <T>(url: string, options?: RequestOptions) => request<T>("DELETE", url, options);

export type GetToken = () => Promise<string>;

export const enc = encodeURIComponent;

/** Stringifies a query object for the URL (numbers become strings, undefined dropped). */
export const qs = (query: Record<string, string | number | boolean | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));

/** qs as a URL query string ("?a=1&b=2", or "" when empty) for direct fetch calls. */
export const queryString = (query: Record<string, string>): string => {
  const sp = new URLSearchParams(query);
  return sp.size ? `?${sp}` : "";
};
