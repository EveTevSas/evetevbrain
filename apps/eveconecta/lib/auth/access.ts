import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appRoleSchema, initialsFor, roleLabels, type AuthenticatedUserView } from "./permissions";
import { ACTIVE_CONJUNTO_COOKIE } from "./tenant-cookie";

export interface CurrentAccess {
  conjuntoId: string;
  conjuntoName: string;
  availableConjuntos: Array<{ id: string; name: string }>;
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

  const { data: memberships, error: membershipError } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("conjunto_id, rol")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("creado_en", { ascending: true });

  if (membershipError || !memberships?.length) {
    redirect("/sin-acceso");
  }

  const cookieStore = await cookies();
  const requestedConjuntoId = cookieStore.get(ACTIVE_CONJUNTO_COOKIE)?.value;
  const membership =
    memberships.find((item) => item.conjunto_id === requestedConjuntoId) ?? memberships[0]!;
  const parsedRole = appRoleSchema.safeParse(membership.rol);
  if (!parsedRole.success) {
    redirect("/sin-acceso");
  }

  const conjuntoIds = memberships.map((item) => item.conjunto_id);
  const { data: conjuntos } = await supabase
    .schema("conjuntos")
    .from("conjuntos")
    .select("id, nombre")
    .in("id", conjuntoIds);
  const conjunto = conjuntos?.find((item) => item.id === membership.conjunto_id);
  const availableConjuntos = conjuntoIds.map((id) => ({
    id,
    name: conjuntos?.find((item) => item.id === id)?.nombre ?? "EveConecta"
  }));

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
    availableConjuntos,
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
