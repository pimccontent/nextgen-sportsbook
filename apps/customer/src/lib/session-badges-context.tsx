"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";

type SessionBadgesContextValue = {
  openBets: number;
  chatUnread: number;
  refreshBadges: () => Promise<void>;
  setChatUnread: (n: number) => void;
};

const SessionBadgesContext = React.createContext<SessionBadgesContextValue | null>(
  null
);

export function SessionBadgesProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { config } = useBrand();
  const chatEnabled = Boolean(config?.support?.enabled);
  const [openBets, setOpenBets] = React.useState(0);
  const [chatUnread, setChatUnread] = React.useState(0);
  const openBetsRef = React.useRef(0);
  const chatUnreadRef = React.useRef(0);
  openBetsRef.current = openBets;
  chatUnreadRef.current = chatUnread;

  const refreshBadges = React.useCallback(async () => {
    if (!token) return;

    try {
      const data = await api.bets(token);
      setOpenBets(data.bets.filter((b) => b.status === "open").length);
    } catch {
      // keep last-good openBetsRef
    }

    if (chatEnabled) {
      try {
        const d = await api.supportChat(token, { create: false, markRead: false });
        setChatUnread(d.conversation?.unreadCustomer ?? 0);
      } catch {
        // keep last-good chatUnreadRef
      }
    } else {
      setChatUnread(0);
    }
  }, [token, chatEnabled]);

  React.useEffect(() => {
    if (!token) {
      setOpenBets(0);
      setChatUnread(0);
      return;
    }

    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      void refreshBadges();
    };

    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      load();
    }, 20_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [token, refreshBadges]);

  const value = React.useMemo(
    () => ({ openBets, chatUnread, refreshBadges, setChatUnread }),
    [openBets, chatUnread, refreshBadges]
  );

  return (
    <SessionBadgesContext.Provider value={value}>
      {children}
    </SessionBadgesContext.Provider>
  );
}

export function useSessionBadges() {
  const ctx = React.useContext(SessionBadgesContext);
  if (!ctx) {
    throw new Error("useSessionBadges must be used within SessionBadgesProvider");
  }
  return ctx;
}
