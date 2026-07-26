import "server-only";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appRoleSchema, initialsFor, roleLabels, type AuthenticatedUserView } from "./permissions";

export interface CurrentAccess {
  conjuntoId: string;
  conjuntoName: string;
  user: AuthenticatedUserView;
}

export async function requireCurrentAccess(): Promise<CurrentAccess> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("conjunto_id, rol")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/sin-acceso");
  }

  const parsedRole = appRoleSchema.safeParse(membership.rol);
  if (!parsedRole.success) {
    redirect("/sin-acceso");
  }

  const { data: conjunto } = await supabase
    .schema("conjuntos")
    .from("conjuntos")
    .select("nombre")
    .eq("id", membership.conjunto_id)
    .maybeSingle();

  const email = user.email ?? "";
  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : "";
  const name = metadataName.trim() || email.split("@")[0] || "Usuario EveConecta";

  return {
    conjuntoId: membership.conjunto_id,
    conjuntoName: conjunto?.nombre ?? "EveConecta",
    user: {
      email,
      id: user.id,
      initials: initialsFor(name, email),
      name,
      role: parsedRole.data,
      roleLabel: roleLabels[parsedRole.data]
    }
  };
}
