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

export const httpGET =<T>(url: string, options?: RequestOptions) => request<T>("GET", url, options);
export const httpPOST = <T>(url: string, options?: RequestOptions) => request<T>("POST", url, options);
export const httpPATCH = <T>(url: string, options?: RequestOptions) => request<T>("PATCH", url, options);
export const httpPUT = <T>(url: string, options?: RequestOptions) => request<T>("PUT", url, options);
export const httpDELETE = <T>(url: string, options?: RequestOptions) => request<T>("DELETE", url, options);

export type GetToken = () => Promise<string>;

export const enc = encodeURIComponent;

/** Stringifies a query object for the URL (numbers become strings, undefined dropped). */
export const qs = (query: Record<string, string | number | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
