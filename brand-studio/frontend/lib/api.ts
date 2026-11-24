import type { BrandDetail, BrandSummary, Brief, LockPart, PublicBrand, User } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    if (typeof body?.detail === "string") detail = body.detail;
    else if (Array.isArray(body?.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join(", ");
    else if (res.status >= 500) detail = "The server isn't responding. Is the backend running?";
    throw new ApiError(res.status, detail);
  }
  return body as T;
}

const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  // auth
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => post<User>("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) => post<User>("/auth/register", { name, email, password }),
  logout: () => post<void>("/auth/logout"),

  // brands
  listBrands: () => request<BrandSummary[]>("/brands"),
  createBrand: (brief: Brief) => post<BrandDetail>("/brands", brief),
  getBrand: (id: number) => request<BrandDetail>(`/brands/${id}`),
  regenerate: (id: number, locked: LockPart[], brief?: Brief) =>
    post<BrandDetail>(`/brands/${id}/regenerate`, { locked, brief }),
  restore: (id: number, version: number) => post<BrandDetail>(`/brands/${id}/versions/${version}/restore`),
  updateBrand: (id: number, patch: { name?: string; is_public?: boolean }) =>
    request<BrandDetail>(`/brands/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteBrand: (id: number) => request<void>(`/brands/${id}`, { method: "DELETE" }),

  // public
  publicBrand: (slug: string) => request<PublicBrand>(`/public/${encodeURIComponent(slug)}`),
};
