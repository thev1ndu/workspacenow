export interface RuntimeConfig {
  organizationName: string;
  installationName: string;
  version: string;
  mockLatencyMs: number;
  // Platform API origin; empty runs the in-browser demo platform.
  apiBaseUrl: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const defaults: RuntimeConfig = {
  organizationName: "WorkspaceNow",
  installationName: "WorkspaceNow",
  version: "dev",
  mockLatencyMs: 0,
  apiBaseUrl: "",
};

/** Load-time runtime config injected by public/config.js before React mounts. */
export const globalConfig: RuntimeConfig = {
  ...defaults,
  ...(typeof window !== "undefined" ? window.__RUNTIME_CONFIG__ : {}),
};
