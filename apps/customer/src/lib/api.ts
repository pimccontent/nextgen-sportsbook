const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

export type ApiUser = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  two_factor_enabled: boolean;
  profile: {
    display_name: string | null;
    country_code: string;
    preferred_currency: string;
    kyc_status?: string;
  } | null;
  agent: { referral_code: string; status: string } | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const timeoutMs = 12_000;
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const upstream = options.signal;
  if (upstream) {
    if (upstream.aborted) timeoutCtrl.abort();
    else upstream.addEventListener("abort", () => timeoutCtrl.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: timeoutCtrl.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — API busy or unreachable", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.message ?? `Request failed (${res.status})`,
      res.status,
      json?.errors
    );
  }

  return json.data;
}

export type CustomerBet = {
  id: string;
  placedAtIso: string;
  settledAtIso?: string | null;
  status: string;
  type: string;
  stakeMinor: number;
  potentialReturnMinor: number;
  combinedOdds: number;
  selections: Array<{
    fixtureId: string;
    selectionId: string;
    marketName: string;
    label: string;
    decimalOdds: number;
    result: string;
    fixtureLabel?: string | null;
    fixtureStatus?: string | null;
    period?: string | null;
    minute?: number | null;
    score?: { home: number; away: number } | null;
  }>;
};

export const api = {
  publicConfig() {
    return request<import("@/lib/brand-context").PublicConfig>("/public/config");
  },
  banners() {
    return request<{
      banners: Array<{
        id: string;
        title: string;
        subtitle?: string | null;
        imageUrl: string;
        ctaLabel?: string | null;
        ctaUrl?: string | null;
        sortOrder: number;
      }>;
    }>("/public/banners");
  },
  register(input: {
    security_pin: string;
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    name?: string;
    referral_code?: string;
  }) {
    return request<{
      token: string;
      user: ApiUser;
      wallet?: {
        currency: string;
        availableMinor: number;
        bonusMinor?: number;
        pendingMinor: number;
        reservedMinor: number;
        withdrawableMinor?: number;
        label?: string;
      };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(input: { phone: string; password: string; portal: "customer" }) {
    return request<{
      token: string;
      user: ApiUser;
      wallet?: {
        currency: string;
        availableMinor: number;
        bonusMinor?: number;
        pendingMinor: number;
        reservedMinor: number;
        withdrawableMinor?: number;
        label?: string;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  me(token: string) {
    return request<{
      user: ApiUser;
      wallet?: {
        currency: string;
        availableMinor: number;
        bonusMinor?: number;
        pendingMinor: number;
        reservedMinor: number;
        withdrawableMinor?: number;
        label?: string;
      };
    }>("/auth/me", {}, token);
  },
  logout(token: string) {
    return request<null>("/auth/logout", { method: "POST" }, token);
  },
  changePassword(
    token: string,
    input: { current_password: string; password: string; password_confirmation: string }
  ) {
    return request<null>("/auth/password", {
      method: "PUT",
      body: JSON.stringify(input),
    }, token);
  },
  forgotPassword(phone: string) {
    return request<{ sent: boolean; method?: string }>(
      "/auth/password/forgot",
      { method: "POST", body: JSON.stringify({ phone }) }
    );
  },
  resetPassword(input: {
    phone: string;
    security_pin: string;
    password: string;
    password_confirmation: string;
  }) {
    return request<null>("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  bookingCodes() {
    return request<{
      bookingCodes: Array<{
        code: string;
        legsCount: number;
        createdAt: string | null;
        expiresAt: string | null;
      }>;
    }>("/public/booking-codes");
  },
  bookingCode(code: string) {
    return request<{
      bookingCode: {
        code: string;
        legs: Array<{
          fixtureId: string;
          fixtureLabel: string;
          selectionPublicId: string;
          marketName: string;
          label: string;
          decimalOdds: number;
        }>;
      };
    }>(`/public/booking-codes/${encodeURIComponent(code)}`);
  },
  createBookingCode(
    token: string,
    role: "admin" | "agent",
    body: { selection_public_ids: string[]; listed?: boolean }
  ) {
    const path =
      role === "admin" ? "/admin/booking-codes" : "/agent/booking-codes";
    return request<{
      bookingCode: { code: string; legs: unknown[]; listed: boolean; status: string };
    }>(path, { method: "POST", body: JSON.stringify(body) }, token);
  },
  competitions(sport = "football", opts?: { status?: string; activeFixtures?: boolean }) {
    const q = new URLSearchParams({ sport });
    if (opts?.status) q.set("status", opts.status);
    if (opts?.activeFixtures === false) q.set("active_fixtures", "0");
    return request<{
      competitions: Array<{
        id: string;
        name: string;
        country: string;
        sport: "football";
      }>;
    }>(`/competitions?${q.toString()}`);
  },
  fixtures(params?: { status?: string; competition_id?: string }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.competition_id) q.set("competition_id", params.competition_id);
    const qs = q.toString();
    return request<{ fixtures: import("@nextgen/shared-types").Fixture[] }>(
      `/fixtures${qs ? `?${qs}` : ""}`
    );
  },
  fixture(id: string) {
    return request<{ fixture: import("@nextgen/shared-types").Fixture }>(
      `/fixtures/${encodeURIComponent(id)}`
    );
  },
  fixtureMarkets(id: string) {
    return request<{ markets: import("@nextgen/shared-types").Market[] }>(
      `/fixtures/${encodeURIComponent(id)}/markets`
    );
  },
  wallet(token: string) {
    return request<{
      wallet: {
        currency: string;
        availableMinor: number;
        pendingMinor: number;
        reservedMinor: number;
        label: string;
      };
    }>("/customer/wallet", {}, token);
  },
  deposit(
    token: string,
    input: { amount_minor: number; idempotency_key: string }
  ) {
    return request<{
      payment: {
        id: number;
        status: string;
        amountMinor: number;
        reference: string;
        authorizationUrl: string | null;
        mock: boolean;
      };
    }>("/customer/wallet/deposits", {
      method: "POST",
      body: JSON.stringify(input),
    }, token);
  },
  completeMockDeposit(token: string, reference: string) {
    return request<{
      payment: { id: number; status: string; reference: string };
      wallet: {
        currency: string;
        availableMinor: number;
        pendingMinor: number;
        reservedMinor: number;
        label: string;
      };
    }>("/customer/wallet/deposits/mock-complete", {
      method: "POST",
      body: JSON.stringify({ reference }),
    }, token);
  },
  withdraw(
    token: string,
    input: { amount_minor: number; idempotency_key: string }
  ) {
    return request<{
      withdrawal: {
        id: number;
        status: string;
        amountMinor: number;
        reference: string;
      };
      wallet: {
        currency: string;
        availableMinor: number;
        pendingMinor: number;
        reservedMinor: number;
        label: string;
      };
    }>("/customer/wallet/withdrawals", {
      method: "POST",
      body: JSON.stringify(input),
    }, token);
  },
  withdrawals(token: string) {
    return request<{
      withdrawals: Array<{
        id: number;
        status: string;
        amountMinor: number;
        currency: string;
        reference: string | null;
        createdAt: string | null;
        completedAt: string | null;
      }>;
    }>("/customer/wallet/withdrawals", {}, token);
  },
  deposits(token: string) {
    return request<{
      deposits: Array<{
        id: number;
        status: string;
        amountMinor: number;
        currency: string;
        provider: string | null;
        reference: string | null;
        createdAt: string | null;
        completedAt: string | null;
      }>;
    }>("/customer/wallet/deposits", {}, token);
  },
  publicActivity() {
    return request<{
      enabled: boolean;
      illustrativeLabel: string;
      items: Array<{
        id: string;
        kind: "win" | "withdrawal" | string;
        synthetic: boolean;
        displayName: string;
        amountMinor: number;
        message: string;
        at: string | null;
      }>;
    }>("/public/activity");
  },
  supportChat(
    token: string,
    opts?: {
      afterId?: number;
      create?: boolean;
      markRead?: boolean;
      conversationId?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (opts?.afterId) params.set("after_id", String(opts.afterId));
    if (opts?.create === true) params.set("create", "1");
    if (opts?.create === false) params.set("create", "0");
    if (opts?.markRead === false) params.set("mark_read", "0");
    if (opts?.conversationId) params.set("conversation_id", String(opts.conversationId));
    const q = params.toString() ? `?${params}` : "";
    return request<{
      config: import("@/lib/support-chat").SupportConfig;
      conversation: import("@/lib/support-chat").SupportConversation | null;
      conversations?: import("@/lib/support-chat").SupportConversation[];
      messages: import("@/lib/support-chat").SupportMessage[];
      peerTyping: boolean;
    }>(`/customer/support/chat${q}`, {}, token);
  },
  startSupportChat(token: string) {
    return request<{
      config: import("@/lib/support-chat").SupportConfig;
      conversation: import("@/lib/support-chat").SupportConversation;
      conversations?: import("@/lib/support-chat").SupportConversation[];
      messages: import("@/lib/support-chat").SupportMessage[];
      peerTyping: boolean;
    }>("/customer/support/chat/start", { method: "POST", body: JSON.stringify({}) }, token);
  },
  reopenSupportChat(token: string, conversationId: number) {
    return request<{
      config: import("@/lib/support-chat").SupportConfig;
      conversation: import("@/lib/support-chat").SupportConversation;
      conversations?: import("@/lib/support-chat").SupportConversation[];
      messages: import("@/lib/support-chat").SupportMessage[];
      peerTyping: boolean;
    }>(`/customer/support/chat/${conversationId}/reopen`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  async sendSupportMessage(
    token: string,
    payload: {
      body?: string;
      file?: File | null;
      conversationId?: number;
    }
  ) {
    const form = new FormData();
    form.append("body", payload.body ?? "");
    if (payload.conversationId) {
      form.append("conversation_id", String(payload.conversationId));
    }
    if (payload.file) {
      form.append("file", payload.file);
    }
    const headers = new Headers({ Accept: "application/json" });
    headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}/customer/support/chat`, {
      method: "POST",
      headers,
      body: form,
    });
    const json = (await res.json().catch(() => null)) as ApiEnvelope<{
      config: import("@/lib/support-chat").SupportConfig;
      conversation: import("@/lib/support-chat").SupportConversation;
      conversations?: import("@/lib/support-chat").SupportConversation[];
      message: import("@/lib/support-chat").SupportMessage;
      peerTyping: boolean;
    }> | null;
    if (!res.ok || !json?.success) {
      throw new ApiError(json?.message || "Send failed", res.status, json?.errors);
    }
    return json.data;
  },
  supportTyping(token: string, conversationId?: number) {
    return request<{ ok: boolean }>("/customer/support/chat/typing", {
      method: "POST",
      body: JSON.stringify(conversationId ? { conversation_id: conversationId } : {}),
    }, token);
  },
  bets(token: string) {
    return request<{ bets: CustomerBet[] }>("/customer/bets", {}, token);
  },
  bet(token: string, id: string) {
    return request<{ bet: CustomerBet }>(
      `/customer/bets/${encodeURIComponent(id)}`,
      {},
      token
    );
  },
  placeBet(
    token: string,
    input: {
      stake_minor: number;
      idempotency_key: string;
      selections: Array<{ selection_public_id: string; quoted_odds: number }>;
    }
  ) {
    return request<{ bet: { id: string; status: string } }>(
      "/customer/bets",
      { method: "POST", body: JSON.stringify(input) },
      token
    );
  },
  profile(token: string) {
    return request<{ profile: CustomerProfile }>("/customer/profile", {}, token);
  },
  updateProfile(token: string, input: Record<string, unknown>) {
    return request<{ profile: CustomerProfile }>(
      "/customer/profile",
      { method: "PUT", body: JSON.stringify(input) },
      token
    );
  },
};

export type CustomerProfile = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  display_name: string | null;
  country_code: string;
  preferred_currency: string;
  payout: {
    method?: string | null;
    network?: string | null;
    momo_number?: string | null;
    bank_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
  };
  kyc: {
    status?: string;
    id_type?: string | null;
    id_number?: string | null;
    full_name?: string | null;
    date_of_birth?: string | null;
    submitted_at?: string | null;
  };
};
