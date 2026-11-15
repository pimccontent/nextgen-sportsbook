const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

export type ApiUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
};

type Envelope<T> = { success: boolean; message: string; data: T };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), 12_000);
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
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok || !json.success) {
    throw new ApiError(json.message ?? "Request failed", res.status);
  }
  return json.data;
}

export type CommissionSummary = {
  pendingMinor: number;
  heldMinor: number;
  availableMinor: number;
  paidMinor: number;
};

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, portal: "agent" }),
    });
  },
  me(token: string) {
    return request<{ user: ApiUser }>("/auth/me", {}, token);
  },
  logout(token: string) {
    return request<null>("/auth/logout", { method: "POST" }, token);
  },
  publicConfig() {
    return request<{
      branding: {
        display_name: string;
        logo_url?: string | null;
        color_accent?: string | null;
      };
      operations?: {
        environment?: string;
        maintenance_enabled?: boolean;
        maintenance_title?: string;
        maintenance_message?: string;
        maintenance_eta?: string | null;
        show_environment_banner?: boolean;
      };
    }>("/public/config");
  },
  overview(token: string) {
    return request<{
      referralCode: string;
      referralLink: string;
      status: string;
      payoutConfigured: boolean;
      customers: number;
      customersJoinedThisWeek: number;
      commissionableDeposits: number;
      commissionableDepositMinor: number;
      pendingPayouts: number;
      pendingPayoutMinor: number;
      earnedMinor: number;
      commissions: CommissionSummary;
      recentCustomers: Array<{
        userId: number;
        name: string | null;
        joinedAt: string | null;
      }>;
      recentCommissions: Array<{
        id: number;
        source: string;
        status: string;
        amountMinor: number;
        createdAt: string | null;
      }>;
    }>("/agent/overview", {}, token);
  },
  customers(token: string) {
    return request<{
      customers: Array<{
        userId: number;
        name: string;
        phone: string | null;
        joinedAt: string;
        commissionableDeposits: number;
        commissionableDepositMinor: number;
      }>;
    }>("/agent/customers", {}, token);
  },
  commissions(token: string) {
    return request<{
      summary: CommissionSummary;
      entries: Array<{
        id: number;
        source: string;
        status: string;
        amountMinor: number;
        basisMinor: number;
        rateBps: number;
        holdUntil: string | null;
        betId: number | null;
        depositReference: string | null;
        depositAmountMinor: number | null;
      }>;
    }>("/agent/commissions", {}, token);
  },
  profile(token: string) {
    return request<{
      name: string;
      email: string;
      phone: string | null;
      referralCode: string;
      referralLink: string;
      status: string;
      canCreateBookingCodes?: boolean;
      payout: {
        method: string | null;
        network: string | null;
        account: string | null;
        accountName: string | null;
      };
      commissions: CommissionSummary;
    }>("/agent/profile", {}, token);
  },
  updateProfile(
    token: string,
    body: { name: string; email: string; phone?: string | null }
  ) {
    return request<unknown>("/agent/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }, token);
  },
  updatePassword(
    token: string,
    body: { current_password: string; password: string; password_confirmation: string }
  ) {
    return request<null>("/agent/password", {
      method: "PUT",
      body: JSON.stringify(body),
    }, token);
  },
  updatePayoutAccount(
    token: string,
    body: {
      method: "momo" | "bank";
      network?: string | null;
      account: string;
      account_name: string;
    }
  ) {
    return request<unknown>("/agent/payout-account", {
      method: "PUT",
      body: JSON.stringify(body),
    }, token);
  },
  payouts(token: string) {
    return request<{
      payouts: Array<{
        id: string;
        status: string;
        amountMinor: number;
        method: string | null;
        account: string | null;
        createdAt: string;
        processedAt: string | null;
      }>;
    }>("/agent/payouts", {}, token);
  },
  requestPayout(token: string, body: { amount_minor: number; idempotency_key: string }) {
    return request<{
      payout: { id: string; status: string; amountMinor: number };
      commissions: CommissionSummary;
    }>("/agent/payouts", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },
  bookingCodes(token: string) {
    return request<{
      bookingCodes: Array<{
        code: string;
        legs: unknown[];
        status: string;
        listed?: boolean;
      }>;
    }>("/agent/booking-codes", {}, token);
  },
};
