import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { globalConfig } from "@workspacenow/types";

/**
 * Demo stand-in for the customer's OIDC identity provider: the user picks a persona
 * instead of signing in, and the "access token" names that persona. WorkspaceNow still
 * maps the persona's group claims to roles on the platform side.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  title: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  userInfo: AuthUser | null;
  /** Demo mode: pick a persona. OIDC mode: redirect to the identity provider (arg ignored). */
  signIn: (user?: AuthUser) => void;
  /** Local mode: sign in with the system user's credentials against POST /api/v1/auth/login. */
  signInWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const STORAGE_KEY = "workspacenow-session";
const OIDC_KEY = "workspacenow-oidc";
const LOCAL_KEY = "workspacenow-local-token";
const oidcMode = globalConfig.authMode === "oidc" && !!globalConfig.oidc;
const localMode = globalConfig.authMode === "local";

interface OidcSession {
  accessToken: string;
  idToken: string;
  user: AuthUser;
}

// --- OIDC Authorization Code + PKCE helpers ---

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  return { verifier, challenge };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

function userFromIdToken(idToken: string): AuthUser {
  const c = decodeJwtPayload(idToken);
  return {
    id: String(c.sub ?? ""),
    name: String(c.name ?? c.preferred_username ?? c.sub ?? ""),
    email: String(c.email ?? ""),
    title: String(c.title ?? ""),
  };
}

/** Redirects to the IdP's authorize endpoint; returns false when OIDC is not configured. */
async function startOidcLogin(): Promise<boolean> {
  const oidc = globalConfig.oidc;
  if (!oidc) return false;
  const { verifier, challenge } = await pkcePair();
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(OIDC_KEY, JSON.stringify({ verifier, state, redirectUri: oidc.redirectUri }));
  const discovery = await fetch(`${oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`).then((r) => r.json());
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", oidc.clientId);
  url.searchParams.set("redirect_uri", oidc.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
  return true;
}

/** Exchanges the callback's code for tokens; called by the /login/callback route. */
export async function completeOidcLogin(code: string, state: string): Promise<AuthUser> {
  const oidc = globalConfig.oidc;
  const raw = sessionStorage.getItem(OIDC_KEY);
  if (!oidc || !raw) throw new Error("No OIDC login in progress");
  const { verifier, state: expected, redirectUri } = JSON.parse(raw) as { verifier: string; state: string; redirectUri: string };
  if (state !== expected) throw new Error("OIDC state mismatch");
  const discovery = await fetch(`${oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`).then((r) => r.json());
  const tokens = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: oidc.clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  }).then((r) => r.json());
  if (!tokens.access_token || !tokens.id_token) throw new Error("The identity provider returned no tokens");
  const user = userFromIdToken(tokens.id_token);
  const session: OidcSession = { accessToken: tokens.access_token, idToken: tokens.id_token, user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  sessionStorage.setItem(OIDC_KEY, JSON.stringify(session));
  return user;
}

function readOidcSession(): OidcSession | null {
  try {
    const raw = sessionStorage.getItem(OIDC_KEY);
    return raw ? (JSON.parse(raw) as OidcSession) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Without storage the session lasts until reload.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfo] = useState<AuthUser | null>(readSession);

  const signIn = useCallback((user?: AuthUser) => {
    if (oidcMode) {
      void startOidcLogin();
      return;
    }
    if (localMode) return; // local mode signs in with credentials, not a persona
    writeSession(user ?? null);
    setUserInfo(user ?? null);
  }, []);

  const signInWithCredentials = useCallback(async (email: string, password: string) => {
    const base = globalConfig.apiBaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let message = `Sign-in failed (${res.status})`;
      try {
        const err = (await res.json()) as { message?: string };
        if (err.message) message = err.message;
      } catch { /* keep default */ }
      throw new Error(message);
    }
    const { token } = (await res.json()) as { token: string };
    localStorage.setItem(LOCAL_KEY, token);
    const sessionRes = await fetch(`${base}/api/v1/session`, { headers: { Authorization: `Bearer ${token}` } });
    if (!sessionRes.ok) throw new Error("Could not load the session");
    const session = (await sessionRes.json()) as { actor: { id: string; name: string } };
    const user: AuthUser = { id: session.actor.id, name: session.actor.name, email, title: "" };
    writeSession(user);
    setUserInfo(user);
  }, []);

  const logout = useCallback(async () => {
    writeSession(null);
    sessionStorage.removeItem(OIDC_KEY);
    localStorage.removeItem(LOCAL_KEY);
    if (oidcMode && globalConfig.oidc) {
      const discovery = await fetch(`${globalConfig.oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`).then((r) => r.json()).catch(() => null);
      if (discovery?.end_session_endpoint) {
        const url = new URL(discovery.end_session_endpoint);
        url.searchParams.set("client_id", globalConfig.oidc.clientId);
        window.location.assign(url.toString());
        return;
      }
    }
    setUserInfo(null);
  }, []);

  const getToken = useCallback(async () => {
    if (oidcMode) return readOidcSession()?.accessToken ?? "";
    if (localMode) return localStorage.getItem(LOCAL_KEY) ?? "";
    return userInfo ? `demo.${userInfo.id}` : "";
  }, [userInfo]);

  // OIDC callback: nothing to do here — the /login/callback route calls completeOidcLogin.

  const value = useMemo(
    () => ({ isAuthenticated: !!userInfo, userInfo, signIn, signInWithCredentials, logout, getToken }),
    [userInfo, signIn, signInWithCredentials, logout, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthHooks(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthHooks must be used inside AuthProvider");
  return context;
}
