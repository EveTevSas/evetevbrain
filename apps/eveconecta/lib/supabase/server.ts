import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";

export async function getSupabaseServerClient() {
  const { publishableKey, url } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Los Server Components no pueden escribir cookies. El Proxy o Route
          // Handler que refresca la sesión se encarga en ese contexto.
        }
      }
    }
  });
}

// Sin cookies ni sesión: para el único flujo que llega sin cuenta en el
// portal (el voto por enlace de asamblea) y por eso no puede pasar por
// getSupabaseServerClient. La RPC que se llama con este cliente hace su
// propia validación de autorización a partir del token, no de auth.uid().
export function getSupabaseAnonServerClient() {
  const { publishableKey, url } = getSupabasePublicConfig();
  return createClient(url, publishableKey);
}
