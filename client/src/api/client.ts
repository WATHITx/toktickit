const BASE_URL = "/api";

// Error body fields used by the Lab 4 API (docs/lab-04/api-spec.md, "Conventions")
export type ApiErrorBody = {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
  reasons?: string[];
  currentVersion?: number;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: ApiErrorBody = {}) {
    super(message);
  }
  get code() { return this.body.code; }
  get fields() { return this.body.fields ?? {}; }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || "Request failed", res.status, body);
  }
  return res.json();
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || "Request failed", res.status, body);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || "Request failed", res.status, body);
  }
  return res.json();
}
