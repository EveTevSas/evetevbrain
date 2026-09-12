import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface Sesion {
  email: string;
  nombre: string;
  /** JWT para llamar a la API de EvePay como esta persona (su rol decide allá). */
  accessToken: string | null;
  rolEvepay: string | null;
}

export async function sesionActual(): Promise<Sesion> {
  const supabase = await getSupabaseServerClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession()
  ]);
  const user = userData.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return {
    email: user?.email ?? "",
    nombre: String(meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? ""),
    accessToken: sessionData.session?.access_token ?? null,
    rolEvepay: user?.app_metadata?.role ? String(user.app_metadata.role) : null
  };
}
