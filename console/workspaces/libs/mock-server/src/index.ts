import { handleRequest, type MockRequest, type MockResponse } from "./router";
import { createDemoPlatform, createPlatform } from "./runtime";
import { clearState, loadState, saveState } from "./state";
import type { Platform } from "./platform";

export { createDemoPlatform, createPlatform } from "./runtime";
export { handleRequest } from "./router";
export type { MockRequest, MockResponse } from "./router";
export type { Platform, ExecutionContext } from "./platform";
export type { PlatformState } from "./state";

let platform: Platform | undefined;

function current(): Platform {
  if (!platform) {
    const stored = loadState();
    platform = stored ? createPlatform(stored) : createDemoPlatform();
    if (!stored) saveState(platform.state);
  }
  return platform;
}

/** The installation's API, served in the browser for the demo. Writes persist to localStorage. */
export function mockServer(request: MockRequest): MockResponse {
  if (request.method === "POST" && request.path === "/demo/reset") {
    clearState();
    platform = createDemoPlatform();
    saveState(platform.state);
    return { status: 200, body: { reset: true } };
  }
  const response = handleRequest(current(), request);
  if (request.method !== "GET") saveState(current().state);
  return response;
}
