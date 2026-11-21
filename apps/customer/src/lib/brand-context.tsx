"use client";

import * as React from "react";
import { api } from "@/lib/api";

export type PublicConfig = {
  tenant: { slug: string; name: string };
  branding: {
    display_name: string;
    legal_name: string;
    logo_url: string | null;
    favicon_url: string | null;
    support_email: string;
    support_phone: string;
    color_primary: string;
    color_accent: string;
    color_background: string;
    color_surface: string;
    color_text: string;
    font_display: string;
    font_body: string;
  };
  locale: {
    currency: string;
    minor_unit: string;
    timezone: string;
    odds_format: string;
    age_minimum: number;
  };
  betting: {
    min_stake_minor: number;
    max_stake_minor: number;
    max_payout_minor: number;
    bet_types: string;
    odds_change_policy: string;
    cashout_enabled: boolean;
    prematch_only: boolean;
  };
  wallet: {
    min_deposit_minor: number;
    max_deposit_minor: number;
    min_withdrawal_minor: number;
    max_withdrawal_minor: number;
    withdrawal_require_kyc?: boolean;
    withdrawal_require_payout_details?: boolean;
    withdrawal_daily_limit_minor?: number;
    withdrawal_rules_title?: string;
    withdrawal_rules_text?: string;
    withdrawal_fee_minor?: number;
    withdrawal_approval?: string;
  };
  payments: {
    provider: string;
    public_key: string;
    mode: string;
    deposits_enabled?: boolean;
    mock_deposits?: boolean;
    callback_url?: string | null;
  };
  promotions?: {
    deposit_bonus_enabled?: boolean;
    deposit_bonus_percent_bps?: number;
    deposit_bonus_max_minor?: number;
    deposit_bonus_first_only?: boolean;
    deposit_bonus_title?: string;
    deposit_bonus_blurb?: string;
    win_bonus_enabled?: boolean;
    win_bonus_percent_bps?: number;
    win_bonus_max_minor?: number;
    win_bonus_title?: string;
    win_bonus_blurb?: string;
  };
  compliance: {
    jurisdiction: string;
    licence_label: string;
    rg_footer_enabled: boolean;
    rg_message: string;
    self_exclusion_enabled: boolean;
  };
  legal?: {
    terms: { title: string; body: string };
    privacy: { title: string; body: string };
    responsible_gambling: { title: string; body: string };
    about: { title: string; body: string };
  };
  operations?: {
    environment: "sandbox" | "live" | string;
    maintenance_enabled: boolean;
    maintenance_title: string;
    maintenance_message: string;
    maintenance_eta?: string | null;
    show_environment_banner?: boolean;
  };
  messaging?: {
    popup?: {
      enabled: boolean;
      id: string;
      title: string;
      body: string;
      ctaLabel: string;
      ctaUrl?: string | null;
      dismissible: boolean;
    };
    toast?: {
      enabled: boolean;
      id: string;
      message: string;
      tone: "info" | "success" | "warning" | string;
    };
  };
  meta?: {
    mock?: boolean;
    environment?: string;
    payments_mode?: string;
    maintenance?: boolean;
  };
};

type BrandContextValue = {
  config: PublicConfig | null;
  loading: boolean;
};

const BrandContext = React.createContext<BrandContextValue>({
  config: null,
  loading: true,
});

const GOLDEN_ORANGE = "#F5A524";
const LEGACY_APPLE_GREEN = new Set(
  ["#b8f000", "#a3e635", "#84cc16", "#bef264", "#d9f99d"].map((c) => c.toLowerCase())
);

function resolveAccent(raw?: string | null): string {
  if (!raw) return GOLDEN_ORANGE;
  const normalized = raw.trim().toLowerCase();
  if (LEGACY_APPLE_GREEN.has(normalized)) return GOLDEN_ORANGE;
  return raw.trim();
}

function applyBranding(branding: PublicConfig["branding"]) {
  // Day/night theme owns surfaces; accent is golden orange (never legacy lime).
  const root = document.documentElement;
  const accent = resolveAccent(branding.color_accent);
  root.style.setProperty("--ng-accent", accent);
  root.style.setProperty("--ng-focus", accent);
  document.title = `${branding.display_name} Sportsbook`;
  if (branding.favicon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url;
  }
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<PublicConfig | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load(isInitial = false) {
      try {
        const data = await api.publicConfig();
        if (cancelled) return;
        setConfig(data);
        applyBranding(data.branding);
      } catch {
        // Never block the app on config failure — render with defaults.
        if (!cancelled && isInitial) setConfig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(true);
    // Hard escape hatch: never leave the gate on "Loading…" forever.
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8_000);
    const id = window.setInterval(() => void load(false), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <BrandContext.Provider value={{ config, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return React.useContext(BrandContext);
}
