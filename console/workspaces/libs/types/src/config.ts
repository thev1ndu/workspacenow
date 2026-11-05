export interface RuntimeConfig {
  organizationName: string;
  installationName: string;
  version: string;
  mockLatencyMs: number;
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
};

/** Load-time runtime config injected by public/config.js before React mounts. */
export const globalConfig: RuntimeConfig = {
  ...defaults,
  ...(typeof window !== "undefined" ? window.__RUNTIME_CONFIG__ : {}),
};
