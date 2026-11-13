const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

export type AgentRow = {
  id: number;
  referralCode: string;
  status: string;
  parentAgentId: number | null;
  parentName?: string | null;
  user: { id?: number; name: string; email: string; phone: string | null };
};

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json.data as T;
}

export async function listAgents(token: string) {
  const res = await fetch(`${API}/admin/agents`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  return parse<{ agents: AgentRow[] }>(res);
}

export async function getAgent(token: string, id: number) {
  const res = await fetch(`${API}/admin/agents/${id}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  return parse<{ agent: AgentRow }>(res);
}

export async function createAgent(
  token: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${API}/admin/agents`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parse<{ agent: AgentRow }>(res);
}

export async function updateAgent(
  token: string,
  id: number,
  body: Record<string, unknown>
) {
  const res = await fetch(`${API}/admin/agents/${id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parse<{ agent: AgentRow }>(res);
}

export async function deleteAgent(token: string, id: number) {
  const res = await fetch(`${API}/admin/agents/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  return parse<{ agent: AgentRow }>(res);
}
