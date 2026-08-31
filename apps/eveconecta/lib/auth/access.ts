import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { initialsFor, roleLabels, type AuthenticatedUserView } from "./permissions";
import { fetchActiveMemberships, selectActiveMembership } from "./resolve-membership";
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

  const memberships = await fetchActiveMemberships(supabase, user.id);
  if (!memberships?.length) {
    redirect("/sin-acceso");
  }

  const cookieStore = await cookies();
  const membership = selectActiveMembership(
    memberships,
    cookieStore.get(ACTIVE_CONJUNTO_COOKIE)?.value
  );
  if (!membership) {
    redirect("/sin-acceso");
  }

  const conjuntoIds = memberships.map((item) => item.conjunto_id);
  const { data: conjuntos } = await supabase
    .schema("conjuntos")
    .from("conjuntos")
    .select("id, nombre")
    .in("id", conjuntoIds);
  const conjunto = conjuntos?.find((item) => item.id === membership.conjuntoId);
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
    conjuntoId: membership.conjuntoId,
    conjuntoName: conjunto?.nombre ?? "EveConecta",
    availableConjuntos,
    user: {
      email,
      id: user.id,
      initials: initialsFor(name, email),
      name,
      role: membership.role,
      roleLabel: roleLabels[membership.role]
    }
  };
}
