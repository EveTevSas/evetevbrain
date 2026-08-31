import type { SupabaseClient } from "@supabase/supabase-js";
import { appRoleSchema, type AppRole } from "./permissions";

export interface MembershipRow {
  conjunto_id: string;
  rol: string;
}

export interface ActiveMembership {
  conjuntoId: string;
  role: AppRole;
}

export async function fetchActiveMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<MembershipRow[] | null> {
  const { data, error } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("conjunto_id, rol")
    .eq("usuario_id", userId)
    .eq("activo", true)
    .order("creado_en", { ascending: true });

  if (error) return null;
  return data ?? [];
}

// El conjunto activo lo pide el navegador vía cookie, pero solo se honra si
// existe una membresía activa para ese conjunto; de lo contrario se usa la
// membresía más antigua. Middleware, layouts y API deben pasar por aquí para
// que el rol evaluado sea siempre el del mismo conjunto.
export function selectActiveMembership(
  memberships: MembershipRow[],
  requestedConjuntoId: string | undefined
): ActiveMembership | null {
  const membership =
    memberships.find((item) => item.conjunto_id === requestedConjuntoId) ?? memberships[0];
  if (!membership) return null;

  const role = appRoleSchema.safeParse(membership.rol);
  if (!role.success) return null;

  return { conjuntoId: membership.conjunto_id, role: role.data };
}
