import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/db/connection";

/** Cliente de Supabase atado a las cookies de la petición. */
export async function supabase() {
  const tarro = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => tarro.getAll(),
        setAll: (nuevas) => {
          try {
            for (const { name, value, options } of nuevas) tarro.set(name, value, options);
          } catch {
            // Los componentes de servidor no pueden escribir cookies; el
            // middleware ya refresca la sesión, así que aquí se ignora.
          }
        }
      }
    }
  );
}

/**
 * Quién está usando el panel, o `null`.
 *
 * Devuelve el usuario SOLO si además está en `tienda.administrador`. La
 * distinción no es formalismo: `auth.users` es compartido con EveConecta y ahí
 * hay residentes de conjuntos residenciales. Estar autenticado no autoriza a
 * cambiar los precios de la tienda.
 */
export async function administrador() {
  const { data } = await (await supabase()).auth.getUser();
  if (!data.user) return null;

  const filas = await db().execute<{ correo: string }>(
    sql`select correo from tienda.administrador where usuario_id = ${data.user.id}`
  );
  return filas.length > 0 ? { id: data.user.id, correo: filas[0].correo } : null;
}
