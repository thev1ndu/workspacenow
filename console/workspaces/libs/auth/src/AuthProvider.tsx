import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
  signIn: (user: AuthUser) => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const STORAGE_KEY = "workspacenow-session";

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

  const signIn = useCallback((user: AuthUser) => {
    writeSession(user);
    setUserInfo(user);
  }, []);

  const logout = useCallback(async () => {
    writeSession(null);
    setUserInfo(null);
  }, []);

  const getToken = useCallback(async () => (userInfo ? `demo.${userInfo.id}` : ""), [userInfo]);

  const value = useMemo(
    () => ({ isAuthenticated: !!userInfo, userInfo, signIn, logout, getToken }),
    [userInfo, signIn, logout, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthHooks(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthHooks must be used inside AuthProvider");
  return context;
}
