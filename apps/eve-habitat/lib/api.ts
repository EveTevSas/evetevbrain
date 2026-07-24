import { DEMO_TENANT_ID, DEMO_USER_ID } from "@/lib/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-tenant-id", DEMO_TENANT_ID);
  headers.set("x-user-id", DEMO_USER_ID);
  headers.set("x-role", "administrator");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { title?: string } | null;
    throw new ApiError(problem?.title ?? "No fue posible completar la operación", response.status);
  }
  return (await response.json()) as T;
}
