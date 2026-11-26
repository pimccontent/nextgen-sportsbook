export function resolveApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv && fromEnv !== "auto") {
    return fromEnv;
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;
    if (hostname.startsWith("admin.")) {
      return `${protocol}//${hostname.slice("admin.".length)}/api/v1`;
    }
    return `${origin}/api/v1`;
  }
  return "http://localhost:8081/api/v1";
}

const API_BASE = resolveApiBase();

export type DeployStatus = {
  layout: string;
  domain: string | null;
  urls: {
    customer: string | null;
    admin: string | null;
    agent: string | null;
    api: string | null;
    api_health: string | null;
  };
  dns_required: string[];
  update_command: string;
  notes: string[];
};

export type ApiUser = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  two_factor_enabled: boolean;
  is_super_admin?: boolean;
  permissions?: string[];
  last_login_at?: string | null;
  profile?: {
    display_name?: string | null;
    country_code?: string;
    preferred_currency?: string;
  } | null;
};

export type AdminAccount = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  role: string;
  role_label: string;
  status: string;
  is_super_admin: boolean;
  permissions: string[];
  two_factor_enabled: boolean;
  last_login_at: string | null;
};

export type StaffMember = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  role: string;
  role_label: string;
  status: string;
  is_super_admin: boolean;
  permissions: string[];
  last_login_at: string | null;
  created_at: string | null;
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

export type SettingsGroup = {
  group: string;
  version: number;
  payload: Record<string, unknown>;
};

export type PublicConfig = {
  branding?: {
    display_name?: string;
    logo_url?: string | null;
    favicon_url?: string | null;
  };
  payments?: {
    mode?: string;
    provider?: string;
    deposits_enabled?: boolean;
    mock_deposits?: boolean;
  };
  meta?: {
    payments_mode?: string;
    mock?: boolean;
    environment?: string;
    maintenance?: boolean;
  };
  operations?: {
    environment?: string;
    maintenance_enabled?: boolean;
    maintenance_title?: string;
    maintenance_message?: string;
    maintenance_eta?: string | null;
    show_environment_banner?: boolean;
  };
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
  account(token: string) {
    return request<{ account: AdminAccount; modules: Record<string, string> }>(
      "/admin/account",
      {},
      token
    );
  },
  updateAccount(
    token: string,
    input: {
      name?: string;
      display_name?: string | null;
      phone?: string | null;
      email?: string;
    }
  ) {
    return request<{ account: AdminAccount }>(
      "/admin/account",
      { method: "PUT", body: JSON.stringify(input) },
      token
    );
  },
  updateAccountPassword(
    token: string,
    input: { current_password: string; password: string; password_confirmation: string }
  ) {
    return request<null>(
      "/admin/account/password",
      { method: "PUT", body: JSON.stringify(input) },
      token
    );
  },
  staff(token: string) {
    return request<{ staff: StaffMember[]; modules: Record<string, string> }>(
      "/admin/staff",
      {},
      token
    );
  },
  staffMember(token: string, id: number) {
    return request<{ staff: StaffMember; modules: Record<string, string> }>(
      `/admin/staff/${id}`,
      {},
      token
    );
  },
  createStaff(
    token: string,
    input: {
      name: string;
      email: string;
      phone?: string | null;
      password: string;
      display_name?: string | null;
      permissions?: string[];
    }
  ) {
    return request<{ staff: StaffMember; modules: Record<string, string> }>(
      "/admin/staff",
      { method: "POST", body: JSON.stringify(input) },
      token
    );
  },
  updateStaff(
    token: string,
    id: number,
    input: {
      name?: string;
      email?: string;
      phone?: string | null;
      password?: string;
      display_name?: string | null;
      status?: string;
      permissions?: string[];
    }
  ) {
    return request<{ staff: StaffMember; modules: Record<string, string> }>(
      `/admin/staff/${id}`,
      { method: "PUT", body: JSON.stringify(input) },
      token
    );
  },
  suspendStaff(token: string, id: number) {
    return request<{ staff: StaffMember }>(
      `/admin/staff/${id}/suspend`,
      { method: "POST" },
      token
    );
  },
  activateStaff(token: string, id: number) {
    return request<{ staff: StaffMember }>(
      `/admin/staff/${id}/activate`,
      { method: "POST" },
      token
    );
  },
  publicConfig() {
    return request<PublicConfig>("/public/config");
  },
  deploy(token: string) {
    return request<DeployStatus>("/admin/deploy", {}, token);
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
  async uploadMedia(
    token: string,
    file: File,
    kind: "logo" | "favicon" | "banner" | "image" = "image"
  ) {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    const res = await fetch(
      `${resolveApiBase()}/admin/media`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      }
    );
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
      data?: { url: string; path: string; kind: string };
    } | null;
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.message ?? `Upload failed (${res.status})`);
    }
    return json.data;
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
