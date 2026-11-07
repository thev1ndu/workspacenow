// Runtime config read before React mounts, like a self-hosted installation's injected settings.
window.__RUNTIME_CONFIG__ = {
  organizationName: "Northwind Retail",
  installationName: "Northwind WorkspaceNow",
  version: "0.1.0-demo",
  // Simulated latency of the in-browser platform runtime, in milliseconds.
  mockLatencyMs: 120,
  // "demo" (default) picks a persona in the UI. "oidc" redirects to the identity provider
  // with Authorization Code + PKCE; the platform validates tokens via OIDC_JWKS_URL.
  // authMode: "oidc",
  // oidc: { issuer: "https://idp.example.com", clientId: "workspacenow-console", redirectUri: "http://localhost:3100/login/callback" },
};
