import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session }
  } = await getSupabaseBrowserClient().auth.getSession();
  if (!session) {
    throw new ApiError("Debes iniciar sesión para continuar.", 401);
  }

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("authorization", `Bearer ${session.access_token}`);
  const url = path.startsWith("/v1/habitat/") ? `/api${path}` : `${API_URL}${path}`;
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { title?: string } | null;
    throw new ApiError(problem?.title ?? "No fue posible completar la operación", response.status);
  }
  return (await response.json()) as T;
}
