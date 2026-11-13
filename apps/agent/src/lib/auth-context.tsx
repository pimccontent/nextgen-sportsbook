"use client";

import * as React from "react";
import { api, ApiError, type ApiUser } from "@/lib/api";

const TOKEN_KEY = "nextgen.agent.token";

type Ctx = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (!existing) {
      setLoading(false);
      return;
    }
    setToken(existing);
    api
      .me(existing)
      .then((d) => setUser(d.user))
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const data = await api.login(email, password);
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      throw err;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        /* ignore */
      }
    }
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAgentAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAgentAuth requires AuthProvider");
  return ctx;
}
