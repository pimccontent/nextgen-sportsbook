export type ThemeColorKey =
  | "bg"
  | "surface"
  | "surface_2"
  | "border"
  | "text"
  | "muted"
  | "accent"
  | "accent_ink"
  | "danger"
  | "live"
  | "odds_up"
  | "odds_down"
  | "win"
  | "loss"
  | "atmosphere_base"
  | "atmosphere_mid"
  | "atmosphere_edge"
  | "chat_panel"
  | "chat_input"
  | "chat_composer"
  | "chat_bubble_mine"
  | "chat_bubble_mine_ink"
  | "chat_bubble_peer"
  | "chat_bubble_peer_border"
  | "chat_system";

export type ThemePalette = Partial<Record<ThemeColorKey, string>>;

export type BrandThemes = {
  day?: ThemePalette;
  night?: ThemePalette;
};

const CSS_VAR_MAP: Record<ThemeColorKey, string> = {
  bg: "--ng-bg",
  surface: "--ng-surface",
  surface_2: "--ng-surface-2",
  border: "--ng-border",
  text: "--ng-text",
  muted: "--ng-muted",
  accent: "--ng-accent",
  accent_ink: "--ng-accent-ink",
  danger: "--ng-danger",
  live: "--ng-live",
  odds_up: "--ng-odds-up",
  odds_down: "--ng-odds-down",
  win: "--ng-win",
  loss: "--ng-loss",
  atmosphere_base: "--ng-atmosphere-base",
  atmosphere_mid: "--ng-atmosphere-mid",
  atmosphere_edge: "--ng-atmosphere-edge",
  chat_panel: "--ng-chat-panel",
  chat_input: "--ng-chat-input",
  chat_composer: "--ng-chat-composer",
  chat_bubble_mine: "--ng-chat-bubble-mine",
  chat_bubble_mine_ink: "--ng-chat-bubble-mine-ink",
  chat_bubble_peer: "--ng-chat-bubble-peer",
  chat_bubble_peer_border: "--ng-chat-bubble-peer-border",
  chat_system: "--ng-chat-system",
};

const GOLDEN_ORANGE = "#F5A524";
const LEGACY_APPLE_GREEN = new Set(
  ["#b8f000", "#a3e635", "#84cc16", "#bef264", "#d9f99d"].map((c) => c.toLowerCase())
);

export function resolveAccent(raw?: string | null): string {
  if (!raw) return GOLDEN_ORANGE;
  const normalized = raw.trim().toLowerCase();
  if (LEGACY_APPLE_GREEN.has(normalized)) return GOLDEN_ORANGE;
  return raw.trim();
}

export function applyThemePalette(palette: ThemePalette | null | undefined) {
  if (typeof document === "undefined" || !palette) return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP) as Array<[ThemeColorKey, string]>) {
    const raw = palette[key];
    if (!raw || typeof raw !== "string" || !raw.trim()) continue;
    let value = raw.trim();
    if (key === "accent" || key === "chat_bubble_mine") {
      value = resolveAccent(value);
    }
    root.style.setProperty(cssVar, value);
  }
  // Keep focus ring aligned with accent.
  if (palette.accent) {
    root.style.setProperty("--ng-focus", resolveAccent(palette.accent));
  }
}

export function applyLegacyAccent(accent?: string | null) {
  if (typeof document === "undefined") return;
  const value = resolveAccent(accent);
  const root = document.documentElement;
  root.style.setProperty("--ng-accent", value);
  root.style.setProperty("--ng-focus", value);
}
