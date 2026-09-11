import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { rolInterno, type RolInterno } from "./permissions";

/** Quién está en la sesión y con qué rol, para que las páginas muestren solo lo que puede hacer. */
export async function sesionActual(): Promise<{ actor: string; rol: RolInterno | null }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { actor: user?.email ?? user?.id ?? "", rol: rolInterno(user) };
}
