import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { DashboardSnapshot } from "@/lib/contracts";
import { appRoleSchema, initialsFor, roleLabels, type AppRole } from "@/lib/auth/permissions";
import { ACTIVE_CONJUNTO_COOKIE } from "@/lib/auth/tenant-cookie";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class DemoApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface DemoAccess {
  conjuntoId: string;
  role: AppRole;
  supabase: SupabaseClient;
  user: User;
  userName: string;
}

function userNameFor(user: User): string {
  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : "";
  return metadataName.trim() || user.email?.split("@")[0] || "Usuario EveConecta";
}

function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardSnapshot>;
  return Boolean(
    candidate.tenant &&
    Array.isArray(candidate.metrics) &&
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.cases) &&
    Array.isArray(candidate.audit)
  );
}

export async function getDemoAccess(): Promise<DemoAccess> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new DemoApiError("Debes iniciar sesión para continuar.", 401);
  }

  const { data: memberships, error: membershipError } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("conjunto_id, rol")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("creado_en", { ascending: true });

  if (membershipError || !memberships?.length) {
    throw new DemoApiError("Tu usuario no tiene una copropiedad activa.", 403);
  }

  const cookieStore = await cookies();
  const requestedConjuntoId = cookieStore.get(ACTIVE_CONJUNTO_COOKIE)?.value;
  const membership =
    memberships.find((item) => item.conjunto_id === requestedConjuntoId) ?? memberships[0]!;
  const role = appRoleSchema.safeParse(membership.rol);

  if (!role.success) {
    throw new DemoApiError("El rol asignado no es válido.", 403);
  }

  return {
    conjuntoId: membership.conjunto_id,
    role: role.data,
    supabase,
    user,
    userName: userNameFor(user)
  };
}

export async function getDemoSnapshot(access?: DemoAccess): Promise<DashboardSnapshot> {
  const currentAccess = access ?? (await getDemoAccess());
  const { data, error } = await currentAccess.supabase
    .schema("conjuntos")
    .from("escenarios_demo")
    .select("snapshot")
    .eq("conjunto_id", currentAccess.conjuntoId)
    .maybeSingle();

  if (error) {
    throw new DemoApiError("No fue posible consultar el escenario de demostración.", 500);
  }
  if (!data || !isDashboardSnapshot(data.snapshot)) {
    throw new DemoApiError("Esta copropiedad todavía no tiene datos de demostración.", 404);
  }

  const snapshot = structuredClone(data.snapshot);
  snapshot.currentUser = {
    id: currentAccess.user.id,
    name: currentAccess.userName,
    role: roleLabels[currentAccess.role],
    initials: initialsFor(currentAccess.userName, currentAccess.user.email ?? "")
  };
  return snapshot;
}

interface MutationResult<T> {
  action: string;
  detail: string;
  resource: string;
  result: T;
}

export async function mutateDemoSnapshot<T>(
  mutation: (
    snapshot: DashboardSnapshot,
    access: DemoAccess
  ) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  const access = await getDemoAccess();
  if (access.role !== "super_admin" && access.role !== "admin_conjunto") {
    throw new DemoApiError("Tu rol no permite modificar este escenario.", 403);
  }

  const snapshot = await getDemoSnapshot(access);
  const outcome = await mutation(snapshot, access);
  snapshot.audit = [
    {
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      actor: access.userName,
      action: outcome.action,
      resource: outcome.resource,
      detail: outcome.detail,
      result: "success" as const
    },
    ...snapshot.audit
  ].slice(0, 40);

  const { error } = await access.supabase
    .schema("conjuntos")
    .from("escenarios_demo")
    .update({ snapshot, actualizado_en: new Date().toISOString() })
    .eq("conjunto_id", access.conjuntoId);

  if (error) {
    throw new DemoApiError("No fue posible guardar el cambio en Supabase.", 500);
  }
  return outcome.result;
}

export async function canSelectConjunto(conjuntoId: string): Promise<boolean> {
  const access = await getDemoAccess();
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("id")
    .eq("usuario_id", access.user.id)
    .eq("conjunto_id", conjuntoId)
    .eq("activo", true)
    .maybeSingle();
  return !error && Boolean(data);
}
