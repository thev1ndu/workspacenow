export interface RuntimeConfig {
  organizationName: string;
  installationName: string;
  version: string;
  mockLatencyMs: number;
  // Platform API origin; empty runs the in-browser demo platform.
  apiBaseUrl: string;
  // "demo" picks a persona in the UI; "oidc" redirects to the identity provider (code + PKCE);
  // "local" shows a username/password form against the platform's system user (POST /auth/login).
  authMode?: "demo" | "oidc" | "local";
  oidc?: { issuer: string; clientId: string; redirectUri: string };
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
