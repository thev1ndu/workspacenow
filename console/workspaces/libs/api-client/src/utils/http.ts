import { mockServer } from "@workspacenow/mock-server";
import { ApiError, globalConfig, type ApiErrorBody } from "@workspacenow/types";

export const SERVICE_BASE = "/api/v1";

interface RequestOptions {
  token?: string;
  searchParams?: Record<string, string | undefined>;
  body?: unknown;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transport to the installation's API. The demo serves it from the in-browser platform
 * runtime; swapping this for fetch() against a real backend changes nothing above it.
 */
async function request<T>(method: string, url: string, { token, searchParams, body }: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
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

export const httpGET = <T>(url: string, options?: RequestOptions) => request<T>("GET", url, options);
export const httpPOST = <T>(url: string, options?: RequestOptions) => request<T>("POST", url, options);
export const httpPATCH = <T>(url: string, options?: RequestOptions) => request<T>("PATCH", url, options);
export const httpPUT = <T>(url: string, options?: RequestOptions) => request<T>("PUT", url, options);
export const httpDELETE = <T>(url: string, options?: RequestOptions) => request<T>("DELETE", url, options);

export type GetToken = () => Promise<string>;

export const enc = encodeURIComponent;
