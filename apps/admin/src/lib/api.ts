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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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

export type SettingsGroup = {
  group: string;
  version: number;
  payload: Record<string, unknown>;
};

export type PublicConfig = {
  payments?: { mode?: string; provider?: string };
  meta?: { payments_mode?: string; mock?: boolean };
};

export const api = {
  login(input: { email: string; password: string }) {
    return request<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...input, portal: "admin" }),
    });
  },
  me(token: string) {
    return request<{ user: ApiUser }>("/auth/me", {}, token);
  },
  logout(token: string) {
    return request<null>("/auth/logout", { method: "POST" }, token);
  },
  publicConfig() {
    return request<PublicConfig>("/public/config");
  },
  settings(token: string) {
    return request<{
      tenant: { id: number; slug: string; name: string };
      groups: Record<string, SettingsGroup>;
      secrets: Record<string, { configured: boolean; hint: string | null }>;
    }>("/admin/settings", {}, token);
  },
  updateSettings(token: string, group: string, payload: Record<string, unknown>) {
    return request<{ settings: SettingsGroup }>(
      `/admin/settings/${encodeURIComponent(group)}`,
      { method: "PUT", body: JSON.stringify({ payload }) },
      token
    );
  },
  updateSecrets(
    token: string,
    input: {
      paystack_secret_key?: string;
      paystack_webhook_secret?: string;
      sports_api_key?: string;
    }
  ) {
    return request<{
      secrets: Record<string, { configured: boolean; hint: string | null }>;
    }>("/admin/settings/payments/secrets", {
      method: "PUT",
      body: JSON.stringify(input),
    }, token);
  },
  adminFixtures(token: string) {
    return request<{
      fixtures: Array<{
        id: string;
        competition: string;
        home: string;
        away: string;
        kickoffIso: string;
        status: string;
        publicationState: string;
      }>;
    }>("/admin/fixtures", {}, token);
  },
  publishFixture(token: string, id: string) {
    return request<{ id: string; publicationState: string }>(
      `/admin/fixtures/${encodeURIComponent(id)}/publish`,
      { method: "POST" },
      token
    );
  },
  suspendFixture(token: string, id: string) {
    return request<{ id: string; publicationState: string }>(
      `/admin/fixtures/${encodeURIComponent(id)}/suspend`,
      { method: "POST" },
      token
    );
  },
};
