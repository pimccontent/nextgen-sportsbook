"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const WALLET_CACHE_KEY = "nextgen.customer.wallet.v1";

export type CustomerWallet = {
  currency: string;
  availableMinor: number;
  bonusMinor?: number;
  withdrawableMinor?: number;
  pendingMinor: number;
  reservedMinor: number;
  label?: string;
};

type WalletStatus = "idle" | "ready" | "refreshing" | "error";

type WalletContextValue = {
  wallet: CustomerWallet | null;
  status: WalletStatus;
  lastUpdated: number | null;
  refreshWallet: () => Promise<void>;
  applyWallet: (next: CustomerWallet) => void;
};

const WalletContext = React.createContext<WalletContextValue | null>(null);

function readCachedWallet(): CustomerWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(WALLET_CACHE_KEY) ??
      window.sessionStorage.getItem(WALLET_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerWallet;
    if (typeof parsed?.availableMinor !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedWallet(data: CustomerWallet) {
  try {
    const raw = JSON.stringify(data);
    window.localStorage.setItem(WALLET_CACHE_KEY, raw);
    window.sessionStorage.setItem(WALLET_CACHE_KEY, raw);
  } catch {
    // quota / private mode
  }
}

function clearCachedWallet() {
  try {
    window.localStorage.removeItem(WALLET_CACHE_KEY);
    window.sessionStorage.removeItem(WALLET_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { token, bootWallet } = useAuth();
  const [wallet, setWallet] = React.useState<CustomerWallet | null>(null);
  const [status, setStatus] = React.useState<WalletStatus>("idle");
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const walletRef = React.useRef<CustomerWallet | null>(null);
  walletRef.current = wallet;

  const applyWallet = React.useCallback((next: CustomerWallet) => {
    walletRef.current = next;
    setWallet(next);
    writeCachedWallet(next);
    setStatus("ready");
    setLastUpdated(Date.now());
  }, []);

  // Auth login/me may include wallet — paint immediately without waiting for /customer/wallet.
  React.useEffect(() => {
    if (bootWallet) applyWallet(bootWallet as CustomerWallet);
  }, [bootWallet, applyWallet]);

  const refreshWallet = React.useCallback(async () => {
    if (!token) return;
    if (walletRef.current) setStatus("refreshing");
    try {
      const data = await api.wallet(token);
      applyWallet(data.wallet as CustomerWallet);
    } catch {
      setStatus(walletRef.current ? "ready" : "error");
    }
  }, [token, applyWallet]);

  React.useEffect(() => {
    if (!token) {
      walletRef.current = null;
      setWallet(null);
      setStatus("idle");
      setLastUpdated(null);
      clearCachedWallet();
      return;
    }

    let cancelled = false;
    const cached = readCachedWallet();
    if (cached) {
      walletRef.current = cached;
      setWallet(cached);
      setStatus("ready");
    } else if (!walletRef.current) {
      setStatus("idle");
    }

    async function load(soft: boolean) {
      if (cancelled) return;
      if (soft && walletRef.current) setStatus("refreshing");
      try {
        const data = await api.wallet(token!);
        if (cancelled) return;
        applyWallet(data.wallet as CustomerWallet);
      } catch {
        if (cancelled) return;
        setStatus(walletRef.current ? "ready" : "error");
      }
    }

    // Soft-refresh when we already have cache/boot; otherwise hard load.
    void load(Boolean(cached || walletRef.current));

    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    }, 30_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [token, applyWallet]);

  const value = React.useMemo(
    () => ({ wallet, status, lastUpdated, refreshWallet, applyWallet }),
    [wallet, status, lastUpdated, refreshWallet, applyWallet]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
