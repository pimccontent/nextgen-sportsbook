/** Inline beforeInteractive boot — keep tiny; no imports. */
export const CUSTOMER_BOOT_SCRIPT = `(function(){
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem("nextgen.theme");
    var raw = localStorage.getItem("nextgen.publicConfig.v1");
    var cfg = null;
    try { cfg = raw ? JSON.parse(raw) : null; } catch (e) { cfg = null; }
    var branding = cfg && cfg.branding;
    var defaultTheme = branding && branding.default_theme;

    if (theme !== "day" && theme !== "night") {
      if (defaultTheme === "day" || defaultTheme === "night") {
        theme = defaultTheme;
      } else {
        // system (or unset): follow device
        theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night";
      }
    }
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme === "day" ? "light" : "dark";

    if (!branding) return;

    var legacyGreen = { "#b8f000":1, "#a3e635":1, "#84cc16":1, "#bef264":1, "#d9f99d":1 };
    function fixAccent(v) {
      if (!v || typeof v !== "string") return v;
      var a = v.trim().toLowerCase();
      return legacyGreen[a] ? "#F5A524" : v.trim();
    }

    var map = {
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
      chat_system: "--ng-chat-system"
    };

    var palette = branding.themes && branding.themes[theme];
    if (palette && typeof palette === "object") {
      Object.keys(map).forEach(function (key) {
        var val = palette[key];
        if (!val || typeof val !== "string") return;
        if (key === "accent" || key === "chat_bubble_mine") val = fixAccent(val);
        root.style.setProperty(map[key], val);
      });
      if (palette.accent) root.style.setProperty("--ng-focus", fixAccent(palette.accent));
    } else if (branding.color_accent) {
      var accent = fixAccent(branding.color_accent);
      root.style.setProperty("--ng-accent", accent);
      root.style.setProperty("--ng-focus", accent);
    }

    if (typeof branding.display_name === "string" && branding.display_name) {
      document.title = branding.display_name + " Sportsbook";
    }
    if (typeof branding.favicon_url === "string" && branding.favicon_url) {
      var link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }
  } catch (e) {}
})();`;
