import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  AccreditAssemblyAttendee,
  AnnouncementItem,
  AssemblyAgendaItem,
  AssemblyAgendaOverview,
  AssemblyAgendaVoting,
  AssemblyAttendee,
  AssemblyItem,
  AssemblyMinutesOverview,
  AssemblyVoteRecord,
  AssemblyVoteTally,
  CaseItem,
  CastVote,
  CreateAgendaItem,
  CreateAnnouncement,
  CreateCase,
  CreatePet,
  CreateRegisteredVehicle,
  CreateReservation,
  CreateVisitor,
  DashboardSnapshot,
  ExpenseItem,
  Payment,
  PetItem,
  RegisteredVehicleItem,
  ReorderAgenda,
  ReservationItem,
  SaveAssemblyMinutes,
  ScheduleAssembly,
  UpdateAgendaItem,
  UpdatePetPhoto,
  UpdatePetStatus,
  VoteOption,
  VisitorItem
} from "@/lib/contracts";
import {
  createAssemblyDossier,
  normalizeAssembly,
  normalizeAssemblySettings
} from "@/lib/assemblies";
import { canInitiatePayment, initialsFor, roleLabels, type AppRole } from "@/lib/auth/permissions";
import { fetchActiveMemberships, selectActiveMembership } from "@/lib/auth/resolve-membership";
import { ACTIVE_CONJUNTO_COOKIE } from "@/lib/auth/tenant-cookie";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createResidentSnapshot } from "./resident-view";

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

  const memberships = await fetchActiveMemberships(supabase, user.id);
  if (!memberships?.length) {
    throw new DemoApiError("Tu usuario no tiene una copropiedad activa.", 403);
  }

  const cookieStore = await cookies();
  const membership = selectActiveMembership(
    memberships,
    cookieStore.get(ACTIVE_CONJUNTO_COOKIE)?.value
  );
  if (!membership) {
    throw new DemoApiError("El rol asignado no es válido.", 403);
  }

  return {
    conjuntoId: membership.conjuntoId,
    role: membership.role,
    supabase,
    user,
    userName: userNameFor(user)
  };
}

async function getRawDemoSnapshot(access: DemoAccess): Promise<DashboardSnapshot> {
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("obtener_escenario_demo", { p_conjunto_id: access.conjuntoId });

  if (error) {
    throw new DemoApiError("No fue posible consultar el escenario de demostración.", 500);
  }
  if (!isDashboardSnapshot(data)) {
    throw new DemoApiError("Esta copropiedad todavía no tiene datos de demostración.", 404);
  }
  const snapshot = structuredClone(data);
  snapshot.pets = (snapshot.pets ?? []).map((pet) => ({
    ...pet,
    photoPath: pet.photoPath ?? null
  }));
  snapshot.parkingSpots ??= [];
  snapshot.vehicles ??= [];
  snapshot.vehicleAccessEvents ??= [];
  snapshot.assemblySettings = normalizeAssemblySettings(snapshot.assemblySettings);
  snapshot.assemblies = (snapshot.assemblies ?? []).map((assembly) => normalizeAssembly(assembly));
  return snapshot;
}

export async function getDemoSnapshot(access?: DemoAccess): Promise<DashboardSnapshot> {
  const currentAccess = access ?? (await getDemoAccess());
  const rawSnapshot = await getRawDemoSnapshot(currentAccess);

  const metadataUnit =
    typeof currentAccess.user.user_metadata.eveconecta_unit === "string"
      ? currentAccess.user.user_metadata.eveconecta_unit
      : "";
  const metadataResidentName =
    typeof currentAccess.user.user_metadata.eveconecta_resident_name === "string"
      ? currentAccess.user.user_metadata.eveconecta_resident_name
      : currentAccess.userName;
  const snapshot =
    currentAccess.role === "residente"
      ? createResidentSnapshot(rawSnapshot, {
          name: metadataResidentName,
          unit: metadataUnit
        })
      : rawSnapshot;
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
  auditResult?: "success" | "denied";
  detail: string;
  resource: string;
  result: T;
}

async function persistMutation<T>(
  snapshot: DashboardSnapshot,
  access: DemoAccess,
  outcome: MutationResult<T>
): Promise<T> {
  snapshot.audit = [
    {
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      actor: access.userName,
      action: outcome.action,
      resource: outcome.resource,
      detail: outcome.detail,
      result: outcome.auditResult ?? ("success" as const)
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

  const snapshot = await getRawDemoSnapshot(access);
  const outcome = await mutation(snapshot, access);
  return persistMutation(snapshot, access, outcome);
}

export async function createAmenityReservation(input: CreateReservation): Promise<ReservationItem> {
  const access = await getDemoAccess();

  if (access.role === "residente") {
    const { data, error } = await access.supabase
      .schema("conjuntos")
      .rpc("reservar_zona_residente_demo", {
        p_conjunto_id: access.conjuntoId,
        p_fecha: input.date,
        p_hora: input.time,
        p_zona: input.amenity
      });

    if (error) {
      if (error.code === "23505") throw new DemoApiError(error.message, 409);
      if (error.code === "42501") throw new DemoApiError(error.message, 403);
      if (error.code === "22023" || error.code === "22007") {
        throw new DemoApiError(error.message, 400);
      }
      throw new DemoApiError("No fue posible confirmar la reserva.", 500);
    }
    if (!data || typeof data !== "object") {
      throw new DemoApiError("Supabase no devolvió la reserva confirmada.", 500);
    }
    return data as ReservationItem;
  }

  if (access.role !== "super_admin" && access.role !== "admin_conjunto") {
    throw new DemoApiError("Tu rol no permite crear reservas.", 403);
  }

  return mutateDemoSnapshot<ReservationItem>((snapshot) => {
    const unavailable = snapshot.reservations.some(
      (reservation) =>
        reservation.amenity === input.amenity &&
        reservation.date === input.date &&
        reservation.time === input.time &&
        reservation.status !== "cancelled"
    );
    if (unavailable) {
      throw new DemoApiError("La zona ya está reservada para esa fecha y hora.", 409);
    }

    const item: ReservationItem = {
      id: crypto.randomUUID(),
      ...input,
      amountMinor: input.amenity.toLowerCase().includes("cancha")
        ? 0
        : input.amenity.toLowerCase().includes("bbq")
          ? 12000000
          : 18000000,
      status: "confirmed"
    };
    snapshot.reservations.unshift(item);
    return {
      action: "reservas.reserva_confirmada",
      detail: `${item.amenity}, ${item.date} ${item.time}`,
      resource: item.id,
      result: item
    };
  });
}

export async function createVisitorAuthorization(input: CreateVisitor): Promise<VisitorItem> {
  const access = await getDemoAccess();

  if (access.role === "residente") {
    const { data, error } = await access.supabase
      .schema("conjuntos")
      .rpc("autorizar_visitante_residente_demo", {
        p_conjunto_id: access.conjuntoId,
        p_documento_ultimos4: input.documentSuffix,
        p_nombre: input.name,
        p_placa: input.vehiclePlate,
        p_vigente_desde: input.validFrom,
        p_vigente_hasta: input.validUntil
      });

    if (error) {
      if (error.code === "42501") throw new DemoApiError(error.message, 403);
      if (error.code === "22023" || error.code === "22007") {
        throw new DemoApiError(error.message, 400);
      }
      throw new DemoApiError("No fue posible generar la autorización del visitante.", 500);
    }
    if (!data || typeof data !== "object") {
      throw new DemoApiError("Supabase no devolvió la autorización del visitante.", 500);
    }
    return data as VisitorItem;
  }

  if (access.role !== "super_admin" && access.role !== "admin_conjunto") {
    throw new DemoApiError("Tu rol no permite autorizar visitantes.", 403);
  }

  return mutateDemoSnapshot<VisitorItem>((snapshot) => {
    const item: VisitorItem = {
      id: crypto.randomUUID(),
      ...input,
      status: "expected",
      accessCode: String(100000 + Math.floor(Math.random() * 900000)),
      offlineCreated: false
    };
    snapshot.visitors.unshift(item);
    return {
      action: "porteria.visitante_autorizado",
      detail: `Autorización creada para ${item.unit}`,
      resource: item.id,
      result: item
    };
  });
}

export async function createCase(input: CreateCase): Promise<CaseItem> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase.schema("conjuntos").rpc("crear_caso_demo", {
    p_conjunto_id: access.conjuntoId,
    p_titulo: input.title,
    p_categoria: input.category,
    p_solicitante: input.requester ?? "",
    p_unidad: input.unit ?? "",
    p_prioridad: input.priority,
    p_imagenes: input.imagePaths ?? []
  });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    throw new DemoApiError("No fue posible crear el caso.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el caso creado.", 500);
  }
  return data as CaseItem;
}

export async function approveExpense(expenseId: string): Promise<ExpenseItem> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase.schema("conjuntos").rpc("aprobar_gasto_demo", {
    p_conjunto_id: access.conjuntoId,
    p_gasto_id: expenseId
  });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    if (error.code === "23505" || error.code === "55000") {
      throw new DemoApiError(error.message, 409);
    }
    throw new DemoApiError("No fue posible registrar la aprobación del gasto.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el gasto aprobado.", 500);
  }
  return data as ExpenseItem;
}

export async function createResidentPet(input: CreatePet): Promise<PetItem> {
  const access = await getDemoAccess();
  if (access.role !== "residente") {
    throw new DemoApiError("El registro de mascotas corresponde al residente de la unidad.", 403);
  }
  const { data, error } = await access.supabase.schema("conjuntos").rpc("registrar_mascota_demo", {
    p_conjunto_id: access.conjuntoId,
    p_tipo: input.type === "dog" ? "perro" : "gato",
    p_anio_nacimiento: input.birthYear,
    p_tamano: input.size === "large" ? "grande" : input.size === "medium" ? "mediano" : "pequeno",
    p_nombre: input.name,
    p_estado: input.status === "active" ? "activo" : "inactivo"
  });
  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible registrar la mascota.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el registro de la mascota.", 500);
  }
  const pet = data as PetItem;
  return { ...pet, photoPath: pet.photoPath ?? null };
}

export async function createResidentVehicle(
  input: CreateRegisteredVehicle
): Promise<RegisteredVehicleItem> {
  const access = await getDemoAccess();
  if (access.role !== "residente") {
    throw new DemoApiError("El registro de vehículos corresponde al residente de la unidad.", 403);
  }
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("registrar_vehiculo_residente_demo", {
      p_conjunto_id: access.conjuntoId,
      p_placa: input.plate,
      p_clase:
        input.kind === "car" ? "automovil" : input.kind === "motorcycle" ? "motocicleta" : "otro",
      p_marca: input.brand,
      p_color: input.color,
      p_vigente_hasta: input.validUntil
    });
  if (error) {
    if (error.code === "23505") {
      throw new DemoApiError("Esa placa ya está registrada en la copropiedad.", 409);
    }
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    throw new DemoApiError("No fue posible registrar el vehículo.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el vehículo registrado.", 500);
  }
  return data as RegisteredVehicleItem;
}

export async function createAnnouncement(input: CreateAnnouncement): Promise<AnnouncementItem> {
  const access = await getDemoAccess();
  if (access.role !== "super_admin" && access.role !== "admin_conjunto") {
    throw new DemoApiError("Tu rol no permite crear comunicados.", 403);
  }

  const status =
    input.publicationMode === "publish_now"
      ? "publicado"
      : input.publicationMode === "schedule"
        ? "programado"
        : "borrador";
  const publicationDate =
    input.publicationMode === "schedule" && input.scheduledAt
      ? input.scheduledAt
      : new Date().toISOString();
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("registrar_comunicado_demo", {
      p_conjunto_id: access.conjuntoId,
      p_titulo: input.title,
      p_mensaje: input.message,
      p_audiencia: input.audience,
      p_canales: input.channels,
      p_estado: status,
      p_publicado_en: publicationDate
    });
  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    throw new DemoApiError("No fue posible registrar el comunicado.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el comunicado registrado.", 500);
  }
  return data as AnnouncementItem;
}

export async function scheduleAssembly(input: ScheduleAssembly): Promise<AssemblyItem> {
  const access = await getDemoAccess();
  if (access.role !== "super_admin" && access.role !== "admin_conjunto") {
    throw new DemoApiError("Tu rol no permite programar asambleas.", 403);
  }

  const { data, error } = await access.supabase.schema("conjuntos").rpc("programar_asamblea_demo", {
    p_conjunto_id: access.conjuntoId,
    p_titulo: input.title,
    p_tipo:
      input.type === "ordinary"
        ? "ordinaria"
        : input.type === "extraordinary"
          ? "extraordinaria"
          : "informativa",
    p_modalidad:
      input.mode === "in_person" ? "presencial" : input.mode === "virtual" ? "virtual" : "hibrida",
    p_inicia_en: input.startsAt,
    p_ubicacion: input.location,
    p_orden_del_dia: input.agenda
  });
  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    throw new DemoApiError("No fue posible programar la asamblea.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la asamblea programada.", 500);
  }
  const result = normalizeAssembly(data as AssemblyItem);
  result.dossier = {
    ...createAssemblyDossier(result),
    callType: input.callType,
    propertyUse: input.propertyUse
  };

  const snapshot = await getRawDemoSnapshot(access);
  const stored = snapshot.assemblies.find((assembly) => assembly.id === result.id);
  if (stored) {
    stored.dossier = result.dossier;
    const { error: snapshotError } = await access.supabase
      .schema("conjuntos")
      .from("escenarios_demo")
      .update({ snapshot, actualizado_en: new Date().toISOString() })
      .eq("conjunto_id", access.conjuntoId);
    if (snapshotError) {
      throw new DemoApiError(
        "La asamblea se programó, pero no fue posible preparar el expediente.",
        500
      );
    }
  }
  return result;
}

export async function accreditAssemblyAttendee(
  assemblyId: string,
  input: AccreditAssemblyAttendee
): Promise<AssemblyAttendee> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("acreditar_asistente_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_calidad: input.calidad,
      p_persona_id: input.personaId,
      p_unidad_codigo: input.unidadCodigo,
      p_representa_persona_id: input.representaPersonaId,
      p_canal: input.canal,
      p_soporte_path: input.soportePath
    });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    if (error.code === "23505") throw new DemoApiError(error.message, 409);
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    throw new DemoApiError("No fue posible acreditar al asistente.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la acreditación registrada.", 500);
  }
  return data as AssemblyAttendee;
}

export async function revokeAssemblyAccreditation(
  assemblyId: string,
  attendeeId: string
): Promise<{ id: string }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("revocar_acreditacion_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_acreditacion_id: attendeeId
    });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    throw new DemoApiError("No fue posible revocar la acreditación.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la revocación.", 500);
  }
  return data as { id: string };
}

export async function listAssemblyAttendees(assemblyId: string): Promise<AssemblyAttendee[]> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("listar_asistentes_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId
    });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible consultar los asistentes.", 500);
  }
  return (data as AssemblyAttendee[] | null) ?? [];
}

export async function listAssemblyAgenda(assemblyId: string): Promise<AssemblyAgendaOverview> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase.schema("conjuntos").rpc("listar_orden_dia_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId
  });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible consultar el orden del día.", 500);
  }
  return data as AssemblyAgendaOverview;
}

const decisionTypeToSql: Record<CreateAgendaItem["decisionType"], string> = {
  informative: "informativa",
  economic: "economica",
  non_economic: "no_economica",
  qualified: "calificada"
};

const votingRuleToSql: Record<CreateAgendaItem["votingRule"], string> = {
  none: "ninguna",
  unit: "unidad",
  coefficient: "coeficiente",
  qualified_coefficient: "coeficiente_calificado"
};

const agendaStatusToSql: Record<UpdateAgendaItem["status"], string> = {
  draft: "borrador",
  ready: "listo"
};

function mapAssemblyWorkflowError(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new DemoApiError(error.message, 403);
  if (error.code === "22023") throw new DemoApiError(error.message, 400);
  if (error.code === "55000") throw new DemoApiError(error.message, 409);
  if (error.code === "23505") throw new DemoApiError(error.message, 409);
  if (error.code === "P0002") throw new DemoApiError(error.message, 404);
  throw new DemoApiError("No fue posible completar la operación.", 500);
}

export async function createAgendaItem(
  assemblyId: string,
  input: CreateAgendaItem
): Promise<AssemblyAgendaItem> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("agregar_punto_orden_dia_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_titulo: input.title,
      p_tipo_decision: decisionTypeToSql[input.decisionType],
      p_regla_votacion: votingRuleToSql[input.votingRule],
      p_umbral_porcentaje: input.thresholdPercent
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el punto creado.", 500);
  }
  return data as AssemblyAgendaItem;
}

export async function updateAgendaItem(
  assemblyId: string,
  itemId: string,
  input: UpdateAgendaItem
): Promise<{ id: string }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("actualizar_punto_orden_dia_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_punto_id: itemId,
      p_titulo: input.title,
      p_tipo_decision: decisionTypeToSql[input.decisionType],
      p_regla_votacion: votingRuleToSql[input.votingRule],
      p_umbral_porcentaje: input.thresholdPercent,
      p_estado: agendaStatusToSql[input.status]
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el punto actualizado.", 500);
  }
  return data as { id: string };
}

export async function deleteAgendaItem(
  assemblyId: string,
  itemId: string
): Promise<{ id: string }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("eliminar_punto_orden_dia_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_punto_id: itemId
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la eliminación.", 500);
  }
  return data as { id: string };
}

export async function reorderAgenda(
  assemblyId: string,
  input: ReorderAgenda
): Promise<{ asambleaId: string; total: number }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("reordenar_orden_dia_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_orden_ids: input.orderedIds
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el nuevo orden.", 500);
  }
  return data as { asambleaId: string; total: number };
}

const voteOptionToSql: Record<VoteOption, string> = {
  yes: "si",
  no: "no",
  abstain: "abstencion"
};

export async function openVoting(assemblyId: string, agendaItemId: string): Promise<void> {
  const access = await getDemoAccess();

  const { error } = await access.supabase.schema("conjuntos").rpc("abrir_votacion_punto_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId,
    p_punto_id: agendaItemId
  });

  if (error) mapAssemblyWorkflowError(error);
}

export async function closeVoting(
  assemblyId: string,
  agendaItemId: string
): Promise<AssemblyVoteTally> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("cerrar_votacion_punto_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_punto_id: agendaItemId
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el resultado de la votación.", 500);
  }
  return data as AssemblyVoteTally;
}

export async function castVote(
  assemblyId: string,
  agendaItemId: string,
  input: CastVote
): Promise<AssemblyVoteRecord> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("votar_punto_orden_dia_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_punto_id: agendaItemId,
      p_unidad_codigo: input.unidadCodigo,
      p_opcion: voteOptionToSql[input.option]
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el voto registrado.", 500);
  }
  return data as AssemblyVoteRecord;
}

export async function revokeVote(
  assemblyId: string,
  voteId: string
): Promise<{ id: string }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("revocar_voto_punto_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_voto_id: voteId
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la revocación.", 500);
  }
  return data as { id: string };
}

export async function listAssemblyVoting(assemblyId: string): Promise<AssemblyAgendaVoting[]> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("listar_votaciones_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId
    });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible consultar las votaciones.", 500);
  }
  return (data as AssemblyAgendaVoting[] | null) ?? [];
}

export async function startAssembly(assemblyId: string): Promise<void> {
  const access = await getDemoAccess();
  const { error } = await access.supabase.schema("conjuntos").rpc("iniciar_asamblea_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId
  });
  if (error) mapAssemblyWorkflowError(error);
}

export async function closeAssembly(assemblyId: string): Promise<void> {
  const access = await getDemoAccess();
  const { error } = await access.supabase.schema("conjuntos").rpc("cerrar_asamblea_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId
  });
  if (error) mapAssemblyWorkflowError(error);
}

export async function fetchAssemblyMinutes(assemblyId: string): Promise<AssemblyMinutesOverview> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("obtener_acta_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId
    });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible consultar el acta.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el acta.", 500);
  }
  return data as AssemblyMinutesOverview;
}

export async function saveAssemblyMinutes(
  assemblyId: string,
  input: SaveAssemblyMinutes
): Promise<{ id: string; version: number }> {
  const access = await getDemoAccess();

  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("guardar_acta_asamblea_demo", {
      p_conjunto_id: access.conjuntoId,
      p_asamblea_id: assemblyId,
      p_presidente_persona_id: input.presidentePersonaId,
      p_secretario_persona_id: input.secretarioPersonaId,
      p_resumen: input.resumen
    });

  if (error) mapAssemblyWorkflowError(error);
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió el acta guardada.", 500);
  }
  return data as { id: string; version: number };
}

export async function signAssemblyMinutes(assemblyId: string): Promise<void> {
  const access = await getDemoAccess();
  const { error } = await access.supabase.schema("conjuntos").rpc("firmar_acta_asamblea_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId
  });
  if (error) mapAssemblyWorkflowError(error);
}

export async function publishAssemblyMinutes(assemblyId: string): Promise<void> {
  const access = await getDemoAccess();
  const { error } = await access.supabase.schema("conjuntos").rpc("publicar_acta_asamblea_demo", {
    p_conjunto_id: access.conjuntoId,
    p_asamblea_id: assemblyId
  });
  if (error) mapAssemblyWorkflowError(error);
}

export async function updateResidentPetPhoto(
  petId: string,
  input: UpdatePetPhoto
): Promise<PetItem> {
  const access = await getDemoAccess();
  if (access.role !== "residente") {
    throw new DemoApiError("Solo el residente de la unidad puede actualizar la foto.", 403);
  }
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("actualizar_foto_mascota_demo", {
      p_conjunto_id: access.conjuntoId,
      p_mascota_id: petId,
      p_foto_path: input.photoPath
    });
  if (error) {
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.code === "22023") throw new DemoApiError(error.message, 400);
    throw new DemoApiError("No fue posible actualizar la foto de la mascota.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la mascota actualizada.", 500);
  }
  return data as PetItem;
}

export async function updateResidentPetStatus(
  petId: string,
  input: UpdatePetStatus
): Promise<PetItem> {
  const access = await getDemoAccess();
  if (access.role !== "residente") {
    throw new DemoApiError("Solo el residente de la unidad puede actualizar la mascota.", 403);
  }
  const { data, error } = await access.supabase
    .schema("conjuntos")
    .rpc("actualizar_estado_mascota_demo", {
      p_conjunto_id: access.conjuntoId,
      p_mascota_id: petId,
      p_estado: input.status === "active" ? "activo" : "inactivo"
    });
  if (error) {
    if (error.code === "P0002") throw new DemoApiError(error.message, 404);
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    throw new DemoApiError("No fue posible actualizar la mascota.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la mascota actualizada.", 500);
  }
  return data as PetItem;
}

export async function payDemoFee(feeId: string): Promise<Payment> {
  const access = await getDemoAccess();
  if (!canInitiatePayment(access.role)) {
    throw new DemoApiError("Solo los residentes pueden iniciar pagos.", 403);
  }

  const { data, error } = await access.supabase.schema("conjuntos").rpc("pagar_obligacion_demo", {
    p_conjunto_id: access.conjuntoId,
    p_fee_id: feeId
  });

  if (error) {
    if (error.code === "42501") throw new DemoApiError(error.message, 403);
    if (error.message.includes("no existe")) throw new DemoApiError(error.message, 404);
    if (error.message.includes("ya fue pagada")) throw new DemoApiError(error.message, 409);
    throw new DemoApiError("No fue posible registrar el pago de demostración.", 500);
  }
  if (!data || typeof data !== "object") {
    throw new DemoApiError("Supabase no devolvió la confirmación del pago.", 500);
  }
  return data as Payment;
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
