"use client";

import * as React from "react";
import { api } from "@/lib/api";
import {
  applyLegacyAccent,
  applyThemePalette,
  resolveAccent,
  type BrandThemes,
} from "@/lib/brand-colors";
import { useTheme, type ThemeMode } from "@/lib/theme-context";

export const PUBLIC_CONFIG_CACHE_KEY = "nextgen.publicConfig.v1";

export type PublicConfig = {
  tenant: { slug: string; name: string };
  branding: {
    display_name: string;
    legal_name: string;
    logo_url: string | null;
    favicon_url: string | null;
    support_email: string;
    support_phone: string;
    support_chat_enabled?: boolean;
    support_chat_url?: string | null;
    support_chat_label?: string;
    /** Operator default for first-time visitors: day | night | system */
    default_theme?: "day" | "night" | "system" | string;
    color_primary: string;
    color_accent: string;
    color_background: string;
    color_surface: string;
    color_text: string;
    font_display: string;
    font_body: string;
    themes?: BrandThemes;
  };
  support?: import("@/lib/support-chat").SupportConfig;
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
    activity?: {
      enabled: boolean;
      includeReal?: boolean;
      includeFake?: boolean;
      intervalMs?: number;
      displayMs?: number;
      position?:
        | "bottom_left"
        | "bottom_center"
        | "bottom_right"
        | "top_left"
        | "top_center"
        | "top_right"
        | string;
      illustrativeLabel?: string;
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

function applyBranding(branding: PublicConfig["branding"], theme: ThemeMode) {
  const palette = branding.themes?.[theme];
  if (palette && Object.keys(palette).length > 0) {
    applyThemePalette(palette);
  } else {
    applyLegacyAccent(branding.color_accent);
  }
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

function readCachedConfig(): PublicConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicConfig;
    if (!parsed?.branding?.display_name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedConfig(data: PublicConfig) {
  try {
    window.localStorage.setItem(PUBLIC_CONFIG_CACHE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}

function readBootTheme(): ThemeMode {
  if (typeof document === "undefined") return "night";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "day" || attr === "night" ? attr : "night";
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { theme, applyOperatorDefault } = useTheme();
  // SSR and the first client render must match — never read localStorage in useState.
  const [config, setConfig] = React.useState<PublicConfig | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const cached = readCachedConfig();
    if (cached) {
      applyOperatorDefault(cached.branding?.default_theme);
      applyBranding(cached.branding, theme || readBootTheme());
      setConfig(cached);
      setLoading(false);
    }

    let cancelled = false;
    async function load(isInitial = false) {
      try {
        const data = await api.publicConfig();
        if (cancelled) return;
        writeCachedConfig(data);
        applyOperatorDefault(data.branding?.default_theme);
        setConfig(data);
        applyBranding(data.branding, theme || readBootTheme());
      } catch {
        if (!cancelled && isInitial && !cached) setConfig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(true);
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8_000);
    const id = window.setInterval(() => void load(false), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(failSafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch once; theme reapplied below
  }, []);

  React.useEffect(() => {
    if (!config?.branding) return;
    applyBranding(config.branding, theme);
  }, [theme, config]);

  return (
    <BrandContext.Provider value={{ config, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return React.useContext(BrandContext);
}

export { resolveAccent };
