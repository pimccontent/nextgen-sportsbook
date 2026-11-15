const STORAGE_KEY = "nextgen.operator.builder";

export type OperatorBuilderSession = {
  role: "admin" | "agent";
  token: string;
};

export function readOperatorBuilder(): OperatorBuilderSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OperatorBuilderSession;
    if (
      (parsed.role === "admin" || parsed.role === "agent") &&
      typeof parsed.token === "string" &&
      parsed.token.length > 10
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearOperatorBuilder() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Capture `#op=admin:<token>` (or agent) + `?booking_builder=1` into sessionStorage, then clean URL. */
export function hydrateOperatorBuilderFromUrl(): OperatorBuilderSession | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("booking_builder") !== "1") {
    return readOperatorBuilder();
  }

  const hash = window.location.hash.replace(/^#/, "");
  const match = /^op=(admin|agent):(.+)$/.exec(hash);
  if (!match) return readOperatorBuilder();

  const session: OperatorBuilderSession = {
    role: match[1] as "admin" | "agent",
    token: decodeURIComponent(match[2]),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));

  const url = new URL(window.location.href);
  url.searchParams.delete("booking_builder");
  url.hash = "";
  window.history.replaceState({}, "", url.pathname + url.search);

  return session;
}

export function customerBuilderUrl(role: "admin" | "agent", token: string) {
  const origin =
    process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${origin}/?booking_builder=1#op=${role}:${encodeURIComponent(token)}`;
}
