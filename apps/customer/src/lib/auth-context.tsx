"use client";

import * as React from "react";
import { api, ApiError, type ApiUser } from "@/lib/api";

const TOKEN_KEY = "nextgen.customer.token";

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: {
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    security_pin: string;
    name?: string;
    referral_code?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const existing = window.localStorage.getItem(TOKEN_KEY);

    async function hydrate() {
      if (!existing) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setToken(existing);

      try {
        const data = await api.me(existing);
        if (!cancelled) setUser(data.user);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (nextToken: string, nextUser: ApiUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (phone: string, password: string) => {
    setError(null);
    try {
      const data = await api.login({ phone, password, portal: "customer" });
      persist(data.token, data.user);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Login failed. Try again.";
      setError(message);
      throw err;
    }
  };

  const register = async (input: {
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    security_pin: string;
    name?: string;
    referral_code?: string;
  }) => {
    setError(null);
    try {
      const data = await api.register(input);
      persist(data.token, data.user);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.errors
            ? Object.values(err.errors).flat().join(" ")
            : err.message
          : "Registration failed. Try again.";
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (token) await api.logout(token);
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
