"use client";

import * as React from "react";
import { api } from "@/lib/api";

export type OpsConfig = {
  environment: "sandbox" | "live" | string;
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_eta?: string | null;
  show_environment_banner?: boolean;
  brandName?: string;
};

type OpsContextValue = {
  ops: OpsConfig | null;
  loading: boolean;
};

const OpsContext = React.createContext<OpsContextValue>({
  ops: null,
  loading: true,
});

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [ops, setOps] = React.useState<OpsConfig | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cfg = await api.publicConfig();
        if (cancelled) return;
        const o = cfg.operations;
        setOps({
          environment: o?.environment === "live" ? "live" : "sandbox",
          maintenance_enabled: Boolean(o?.maintenance_enabled),
          maintenance_title: o?.maintenance_title || "We'll be right back",
          maintenance_message:
            o?.maintenance_message ||
            "The agent portal is undergoing scheduled maintenance.",
          maintenance_eta: o?.maintenance_eta ?? null,
          show_environment_banner: o?.show_environment_banner !== false,
          brandName: cfg.branding?.display_name,
        });
      } catch {
        if (!cancelled) {
          setOps({
            environment: "sandbox",
            maintenance_enabled: false,
            maintenance_title: "We'll be right back",
            maintenance_message: "",
            show_environment_banner: true,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <OpsContext.Provider value={{ ops, loading }}>{children}</OpsContext.Provider>
  );
}

export function useOps() {
  return React.useContext(OpsContext);
}
