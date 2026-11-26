export const ADMIN_MODULES = [
  "dashboard",
  "fixtures",
  "competitions",
  "booking_codes",
  "settlement",
  "banners",
  "customers",
  "support",
  "deposits",
  "withdrawals",
  "agents",
  "agent_payouts",
  "settings",
  "audit",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export const MODULE_PATH_MAP: Record<string, AdminModule> = {
  "/": "dashboard",
  "/fixtures": "fixtures",
  "/competitions": "competitions",
  "/booking-codes": "booking_codes",
  "/settlement": "settlement",
  "/banners": "banners",
  "/customers": "customers",
  "/support": "support",
  "/deposits": "deposits",
  "/wallets": "withdrawals",
  "/agents": "agents",
  "/agent-payouts": "agent_payouts",
  "/settings": "settings",
  "/audit": "audit",
};

export function moduleForPath(pathname: string): AdminModule | null {
  if (pathname === "/account" || pathname.startsWith("/account/")) return null;
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return null;
  if (pathname === "/login") return null;
  for (const [path, mod] of Object.entries(MODULE_PATH_MAP)) {
    if (path === "/") {
      if (pathname === "/") return mod;
      continue;
    }
    if (pathname === path || pathname.startsWith(`${path}/`)) return mod;
  }
  return null;
}

export function hasModule(
  user:
    | { is_super_admin?: boolean; role?: string; permissions?: string[] }
    | null
    | undefined,
  module: string
): boolean {
  if (!user) return false;
  if (user.is_super_admin || user.role === "super_admin") return true;
  return (user.permissions ?? []).includes(module);
}
