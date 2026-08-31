import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, z } from "zod";
import {
  createAnnouncementSchema,
  createAssemblySupportSchema,
  createCaseSchema,
  createExpenseSchema,
  createParkingSpotSchema,
  createPetSchema,
  createRegisteredVehicleSchema,
  createReservationSchema,
  createVisitorSchema,
  createWorkOrderSchema,
  registerVehicleAccessSchema,
  scheduleAssemblySchema,
  sendAssemblyEmailConvocationSchema,
  updateAssemblyCapabilitiesSchema,
  updateAssemblyChecklistSchema,
  updateAssemblySupportStatusSchema,
  updateCommunityPersonSchema,
  updatePetPhotoSchema,
  updatePetStatusSchema,
  type AssemblyConvocationRecipient,
  type AssemblyItem,
  type AssemblySupportDocument,
  type CommunityPerson,
  type ExpenseItem,
  type ParkingSpotItem,
  type ReconciliationResult,
  type VehicleAccessResult,
  type WorkOrderItem
} from "@/lib/contracts";
import { normalizeAssembly, normalizeAssemblySettings } from "@/lib/assemblies";
import { ASSEMBLY_SUPPORT_BUCKET, assemblySupportCategoryLabels } from "@/lib/assembly-supports";
import { ACTIVE_CONJUNTO_COOKIE } from "@/lib/auth/tenant-cookie";
import { communityContactChannels } from "@/lib/community-contacts";
import {
  approveExpense,
  canSelectConjunto,
  createAmenityReservation,
  createAnnouncement,
  createCase,
  createResidentPet,
  createResidentVehicle,
  createVisitorAuthorization,
  DemoApiError,
  getDemoSnapshot,
  mutateDemoSnapshot,
  payDemoFee,
  scheduleAssembly,
  updateResidentPetPhoto,
  updateResidentPetStatus
} from "@/lib/demo/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ segments?: string[] }> };

function problem(message: string, status: number) {
  return NextResponse.json({ title: message }, { status });
}

function handleError(error: unknown) {
  if (error instanceof DemoApiError) return problem(error.message, error.status);
  if (error instanceof ZodError) {
    return problem(error.issues[0]?.message ?? "Los datos enviados no son válidos.", 400);
  }
  console.error("EveConecta demo API", error);
  return problem("No fue posible completar la operación.", 500);
}

function nextCode(prefix: string, count: number) {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}

function normalizeVehicleIdentifier(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    if (segments.join("/") !== "snapshot") return problem("Ruta no encontrada.", 404);
    return NextResponse.json(await getDemoSnapshot());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const path = segments.join("/");
    const body = await request.json().catch(() => ({}));

    if (path === "select-tenant") {
      const { conjuntoId } = z.object({ conjuntoId: z.string().uuid() }).parse(body);
      if (!(await canSelectConjunto(conjuntoId))) {
        throw new DemoApiError("No tienes acceso a esa copropiedad.", 403);
      }
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_CONJUNTO_COOKIE, conjuntoId, {
        httpOnly: true,
        maxAge: 60 * 60 * 12,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
      return NextResponse.json({ conjuntoId });
    }

    if (path === "announcements") {
      const input = createAnnouncementSchema.parse(body);
      return NextResponse.json(await createAnnouncement(input), { status: 201 });
    }

    if (path === "assemblies") {
      const input = scheduleAssemblySchema.parse(body);
      return NextResponse.json(await scheduleAssembly(input), { status: 201 });
    }

    const assemblySupportMatch = path.match(/^assemblies\/([0-9a-f-]+)\/supports$/i);
    if (assemblySupportMatch) {
      const assemblyId = z.string().uuid().parse(assemblySupportMatch[1]);
      const input = createAssemblySupportSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<AssemblySupportDocument>(async (snapshot, access) => {
          const assemblyIndex = snapshot.assemblies.findIndex((item) => item.id === assemblyId);
          if (assemblyIndex < 0) {
            throw new DemoApiError("La asamblea no existe en esta copropiedad.", 404);
          }
          const expectedPrefix = `${access.conjuntoId}/${assemblyId}/${input.documentId}/v${input.version}.`;
          if (!input.filePath.startsWith(expectedPrefix)) {
            throw new DemoApiError("El soporte no pertenece a esta asamblea.", 400);
          }
          const pathSegments = input.filePath.split("/");
          const filename = pathSegments.pop();
          const folder = pathSegments.join("/");
          const { data: storedFiles, error: storageError } = await access.supabase.storage
            .from(ASSEMBLY_SUPPORT_BUCKET)
            .list(folder, { limit: 5, search: filename });
          if (storageError || !storedFiles?.some((item) => item.name === filename)) {
            throw new DemoApiError("No fue posible verificar el archivo cargado.", 400);
          }

          const assembly = normalizeAssembly(snapshot.assemblies[assemblyIndex]!);
          if (
            input.agendaItemId &&
            !assembly.dossier.agendaItems.some((item) => item.id === input.agendaItemId)
          ) {
            throw new DemoApiError("El punto del orden del día no pertenece a esta asamblea.", 400);
          }
          const existingIndex = assembly.dossier.documents.findIndex(
            (document) => document.id === input.documentId
          );
          const existing =
            existingIndex >= 0 ? assembly.dossier.documents[existingIndex] : undefined;
          if (existing?.status === "archived") {
            throw new DemoApiError("Reactiva el soporte antes de cargar una nueva versión.", 409);
          }
          if (existing?.filePath && input.version !== existing.version + 1) {
            throw new DemoApiError("La nueva versión no es consecutiva.", 409);
          }
          if (existing && !existing.filePath && input.version !== existing.version) {
            throw new DemoApiError("La versión inicial del soporte no coincide.", 409);
          }
          if (!existing && input.version !== 1) {
            throw new DemoApiError("El primer archivo debe registrarse como versión 1.", 409);
          }

          const item: AssemblySupportDocument = {
            id: input.documentId,
            name: input.name,
            category: assemblySupportCategoryLabels[input.category],
            agendaItemId: input.agendaItemId,
            version: input.version,
            status: "ready",
            filePath: input.filePath,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            uploadedAt: new Date().toISOString(),
            uploadedBy: access.userName
          };
          if (existingIndex >= 0) assembly.dossier.documents[existingIndex] = item;
          else assembly.dossier.documents.unshift(item);
          snapshot.assemblies[assemblyIndex] = assembly;
          return {
            action: existing ? "asambleas.soporte_versionado" : "asambleas.soporte_cargado",
            detail: `${assembly.title}: ${item.name}, versión ${item.version}`,
            resource: item.id,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    const assemblyEmailConvocationMatch = path.match(
      /^assemblies\/([0-9a-f-]+)\/convocations\/email$/i
    );
    if (assemblyEmailConvocationMatch) {
      const assemblyId = z.string().uuid().parse(assemblyEmailConvocationMatch[1]);
      const input = sendAssemblyEmailConvocationSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<AssemblyItem>((snapshot) => {
          const assemblyIndex = snapshot.assemblies.findIndex((item) => item.id === assemblyId);
          if (assemblyIndex < 0) {
            throw new DemoApiError("La asamblea no existe en esta copropiedad.", 404);
          }

          const assembly = normalizeAssembly(snapshot.assemblies[assemblyIndex]!);
          const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
          const uniquePersonIds = [...new Set(input.personIds)];
          const selectedPeople = uniquePersonIds.map((personId) => peopleById.get(personId));
          if (selectedPeople.some((person) => !person)) {
            throw new DemoApiError("Uno de los residentes no pertenece a la copropiedad.", 400);
          }

          const now = new Date().toISOString();
          const recipients = [...assembly.dossier.convocationRecipients];
          for (const person of selectedPeople) {
            if (!person) continue;
            const channels = communityContactChannels(person);
            if (!channels.hasEmail) {
              throw new DemoApiError(`${person.name} no tiene un correo electrónico válido.`, 400);
            }
            const recipient: AssemblyConvocationRecipient = {
              personId: person.id,
              name: person.name,
              unit: person.unit,
              email: channels.email,
              phone: channels.phone,
              emailStatus: "queued",
              emailUpdatedAt: now,
              whatsappStatus: "pending_integration"
            };
            const existingIndex = recipients.findIndex((item) => item.personId === person.id);
            if (existingIndex >= 0) recipients[existingIndex] = recipient;
            else recipients.push(recipient);
          }

          assembly.dossier.convocationRecipients = recipients;
          assembly.dossier.delivery = {
            sent: recipients.filter((item) => item.emailStatus !== "not_sent").length,
            delivered: recipients.filter((item) =>
              ["delivered", "opened"].includes(item.emailStatus)
            ).length,
            opened: recipients.filter((item) => item.emailStatus === "opened").length
          };
          const emailablePersonIds = snapshot.people
            .filter((person) => communityContactChannels(person).hasEmail)
            .map((person) => person.id);
          const allEmailableQueued = emailablePersonIds.every((personId) =>
            recipients.some(
              (recipient) => recipient.personId === personId && recipient.emailStatus !== "not_sent"
            )
          );
          const convocationChecklistItem = assembly.dossier.checklist.find(
            (item) => item.id === "convocation-sent"
          );
          if (convocationChecklistItem) {
            convocationChecklistItem.completed = allEmailableQueued;
          }
          snapshot.assemblies[assemblyIndex] = assembly;

          return {
            action: "asambleas.convocatoria_email_encolada",
            detail: `${assembly.title}: ${selectedPeople.length} destinatarios en cola de email`,
            resource: assembly.id,
            result: assembly
          };
        }),
        { status: 202 }
      );
    }

    if (path === "cases") {
      const input = createCaseSchema.parse(body);
      return NextResponse.json(await createCase(input), { status: 201 });
    }

    if (path === "reservations") {
      const input = createReservationSchema.parse(body);
      return NextResponse.json(await createAmenityReservation(input), { status: 201 });
    }

    if (path === "visitors") {
      const input = createVisitorSchema.parse(body);
      return NextResponse.json(await createVisitorAuthorization(input), { status: 201 });
    }

    if (path === "pets") {
      const input = createPetSchema.parse(body);
      return NextResponse.json(await createResidentPet(input), { status: 201 });
    }

    if (path === "parking-spots") {
      const input = createParkingSpotSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<ParkingSpotItem>(async (snapshot, access) => {
          snapshot.parkingSpots ??= [];
          const code = input.code.toUpperCase();
          const normalizedCode = normalizeVehicleIdentifier(code);
          if (
            snapshot.parkingSpots.some(
              (parkingSpot) => normalizeVehicleIdentifier(parkingSpot.code) === normalizedCode
            )
          ) {
            throw new DemoApiError("Ese código de parqueadero ya está registrado.", 409);
          }

          let unitId: string | null = null;
          if (input.linkedUnit) {
            const { data: unit, error: unitError } = await access.supabase
              .schema("conjuntos")
              .from("unidades")
              .select("id")
              .eq("conjunto_id", access.conjuntoId)
              .eq("codigo", input.linkedUnit)
              .maybeSingle();
            if (unitError || !unit) {
              throw new DemoApiError("La unidad asociada no existe en la copropiedad.", 400);
            }
            unitId = unit.id;
          }

          const item: ParkingSpotItem = {
            id: crypto.randomUUID(),
            code,
            kind: input.kind,
            sector: input.sector,
            number: input.number,
            linkedUnit: input.linkedUnit,
            assignedUnit: null,
            assignedVehicleId: null,
            status: input.status
          };
          const { error } = await access.supabase
            .schema("conjuntos")
            .from("parqueaderos")
            .insert({
              id: item.id,
              conjunto_id: access.conjuntoId,
              codigo: item.code,
              codigo_normalizado: normalizedCode,
              tipo: item.kind === "zone" ? "zona" : "unidad",
              sector: item.sector,
              numero: item.number,
              unidad_base_id: unitId,
              estado:
                item.status === "maintenance"
                  ? "mantenimiento"
                  : item.status === "assigned"
                    ? "asignado"
                    : "disponible"
            });
          if (error) {
            if (error.code === "23505") {
              throw new DemoApiError("Ese código de parqueadero ya está registrado.", 409);
            }
            throw new DemoApiError("No fue posible registrar el parqueadero.", 500);
          }
          snapshot.parkingSpots.push(item);
          return {
            action: "comunidad.parqueadero_registrado",
            detail: `Parqueadero ${item.code} agregado al inventario`,
            resource: item.id,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    if (path === "vehicles") {
      const input = createRegisteredVehicleSchema.parse(body);
      return NextResponse.json(await createResidentVehicle(input), { status: 201 });
    }

    if (path === "gatehouse/vehicle-accesses") {
      const input = registerVehicleAccessSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<VehicleAccessResult>(async (snapshot, access) => {
          snapshot.vehicles ??= [];
          snapshot.parkingSpots ??= [];
          snapshot.vehicleAccessEvents ??= [];
          const now = new Date();
          const plate = normalizeVehicleIdentifier(input.plate);
          const vehicle = snapshot.vehicles.find((candidate) => candidate.plate === plate);
          const visitor = snapshot.visitors.find((candidate) => candidate.vehiclePlate === plate);

          let allowed = false;
          let reason: VehicleAccessResult["event"]["reason"] = "unknown_vehicle";
          let source: VehicleAccessResult["event"]["source"] = "unknown";
          let unit: string | null = null;
          let parkingCode: string | null = null;
          if (vehicle) {
            source = "permanent";
            unit = vehicle.unit;
            parkingCode = vehicle.parkingCode;
            const dateExpired = Boolean(
              vehicle.validUntil && vehicle.validUntil < now.toISOString().slice(0, 10)
            );
            if (vehicle.accessStatus === "authorized" && !dateExpired) {
              allowed = true;
              reason = "registered_vehicle";
            } else {
              reason =
                vehicle.accessStatus === "suspended" ? "suspended_vehicle" : "expired_vehicle";
            }
          } else if (visitor) {
            source = "visitor";
            unit = visitor.unit;
            const inWindow =
              new Date(visitor.validFrom) <= now &&
              new Date(visitor.validUntil) >= now &&
              visitor.status !== "expired";
            allowed = inWindow;
            reason = inWindow ? "authorized_visitor" : "expired_visitor";
            if (allowed) visitor.status = input.direction === "entry" ? "inside" : "departed";
          }

          const event = {
            id: crypto.randomUUID(),
            plate,
            direction: input.direction,
            decision: allowed ? ("authorized" as const) : ("denied" as const),
            reason,
            source,
            unit,
            parkingCode,
            occurredAt: now.toISOString()
          };

          let unitId: string | null = null;
          if (unit) {
            const { data: unitRow } = await access.supabase
              .schema("conjuntos")
              .from("unidades")
              .select("id")
              .eq("conjunto_id", access.conjuntoId)
              .eq("codigo", unit)
              .maybeSingle();
            unitId = unitRow?.id ?? null;
          }
          const { error } = await access.supabase
            .schema("conjuntos")
            .from("eventos_acceso_vehicular")
            .insert({
              id: event.id,
              conjunto_id: access.conjuntoId,
              vehiculo_id: vehicle?.id ?? null,
              placa_normalizada: plate,
              direccion: input.direction === "entry" ? "ingreso" : "salida",
              decision: allowed ? "autorizado" : "denegado",
              motivo: reason,
              origen:
                source === "permanent"
                  ? "permanente"
                  : source === "visitor"
                    ? "visitante"
                    : "desconocido",
              unidad_id: unitId,
              parqueadero_id: vehicle?.parkingSpotId ?? null,
              actor_usuario_id: access.user.id,
              ocurrido_en: event.occurredAt
            });
          if (error) {
            throw new DemoApiError("No fue posible registrar el evento de acceso.", 500);
          }
          snapshot.vehicleAccessEvents.unshift(event);
          snapshot.vehicleAccessEvents = snapshot.vehicleAccessEvents.slice(0, 30);
          const result: VehicleAccessResult = {
            allowed,
            message: allowed
              ? parkingCode
                ? `Acceso autorizado. Destino: ${unit}; parqueadero ${parkingCode}.`
                : `Acceso autorizado para ${unit}; no tiene parqueadero asignado.`
              : reason === "suspended_vehicle"
                ? "Acceso denegado: el vehículo está suspendido."
                : reason === "expired_vehicle" || reason === "expired_visitor"
                  ? "Acceso denegado: la autorización está vencida."
                  : "Acceso denegado: la placa no tiene una autorización vigente.",
            event
          };
          return {
            action: allowed ? "porteria.vehiculo_autorizado" : "porteria.vehiculo_denegado",
            auditResult: allowed ? "success" : "denied",
            detail: `Decisión registrada para el evento vehicular ${event.id}`,
            resource: event.id,
            result
          };
        })
      );
    }

    if (path === "work-orders") {
      const input = createWorkOrderSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<WorkOrderItem>((snapshot) => {
          const item: WorkOrderItem = {
            id: crypto.randomUUID(),
            code: nextCode("OT", snapshot.workOrders.length),
            ...input,
            status: "planned"
          };
          snapshot.workOrders.unshift(item);
          return {
            action: "mantenimiento.orden_creada",
            detail: `${item.code}: ${item.title}`,
            resource: item.code,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    if (path === "expenses") {
      const input = createExpenseSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<ExpenseItem>((snapshot, access) => {
          const item: ExpenseItem = {
            id: crypto.randomUUID(),
            ...input,
            requestedBy: access.userName,
            approvals: 0,
            approvalsRequired: 2,
            status: "pending_approval",
            createdAt: new Date().toISOString()
          };
          snapshot.expenses.unshift(item);
          return {
            action: "presupuesto.gasto_registrado",
            detail: `${item.concept}: ${item.provider} (${item.providerIdentification})`,
            resource: item.id,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    const expenseMatch = path.match(/^expenses\/([0-9a-f-]+)\/approve$/i);
    if (expenseMatch) {
      const expenseId = z.string().uuid().parse(expenseMatch[1]);
      return NextResponse.json(await approveExpense(expenseId));
    }

    const feeMatch = path.match(/^fees\/([0-9a-f-]+)\/pay-demo$/i);
    if (feeMatch) {
      const feeId = z.string().uuid().parse(feeMatch[1]);
      return NextResponse.json(await payDemoFee(feeId));
    }

    if (path === "reconciliation") {
      return NextResponse.json(
        await mutateDemoSnapshot<ReconciliationResult>((snapshot) => {
          const result = {
            runId: crypto.randomUUID(),
            checkedPayments: snapshot.fees.filter((fee) => fee.status === "paid").length,
            reconciledPayments: snapshot.fees.filter((fee) => fee.status === "paid").length,
            discrepancies: 0,
            completedAt: new Date().toISOString()
          };
          return {
            action: "finanzas.conciliacion_completada",
            detail: `${result.reconciledPayments} pagos conciliados, sin diferencias`,
            resource: result.runId,
            result
          };
        })
      );
    }

    if (path === "gatehouse/sync") {
      const { events } = z
        .object({ events: z.array(z.record(z.string(), z.string())).max(100) })
        .parse(body);
      const result = { accepted: events.length, duplicates: 0 };
      return NextResponse.json(
        await mutateDemoSnapshot<typeof result>(() => ({
          action: "porteria.eventos_sincronizados",
          detail: `${events.length} eventos recibidos desde PORTERIA-01`,
          resource: "PORTERIA-01",
          result
        }))
      );
    }

    return problem("Ruta no encontrada.", 404);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const path = segments.join("/");
    const body = await request.json().catch(() => ({}));

    if (path === "assembly-settings") {
      const input = updateAssemblyCapabilitiesSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot((snapshot) => {
          const current = normalizeAssemblySettings(snapshot.assemblySettings);
          const settings = {
            capabilities: { ...current.capabilities, ...input.capabilities },
            updatedAt: new Date().toISOString()
          };
          snapshot.assemblySettings = settings;
          return {
            action: "asambleas.funcionalidades_actualizadas",
            detail: "La matriz funcional de asambleas fue actualizada para la copropiedad",
            resource: snapshot.tenant.id,
            result: settings
          };
        })
      );
    }

    const checklistMatch = path.match(/^assemblies\/([0-9a-f-]+)\/checklist$/i);
    if (checklistMatch) {
      const assemblyId = z.string().uuid().parse(checklistMatch[1]);
      const input = updateAssemblyChecklistSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot((snapshot) => {
          const assemblyIndex = snapshot.assemblies.findIndex((item) => item.id === assemblyId);
          if (assemblyIndex < 0) {
            throw new DemoApiError("La asamblea no existe en esta copropiedad.", 404);
          }
          const assembly = normalizeAssembly(snapshot.assemblies[assemblyIndex]!);
          const checklistItem = assembly.dossier.checklist.find(
            (item) => item.id === input.checklistItemId
          );
          if (!checklistItem) {
            throw new DemoApiError("La actividad del expediente no existe.", 404);
          }
          checklistItem.completed = input.completed;
          snapshot.assemblies[assemblyIndex] = assembly;
          return {
            action: input.completed
              ? "asambleas.actividad_completada"
              : "asambleas.actividad_reabierta",
            detail: `${assembly.title}: ${checklistItem.label}`,
            resource: assembly.id,
            result: assembly
          };
        })
      );
    }

    const supportStatusMatch = path.match(
      /^assemblies\/([0-9a-f-]+)\/supports\/([0-9a-f-]+)\/status$/i
    );
    if (supportStatusMatch) {
      const assemblyId = z.string().uuid().parse(supportStatusMatch[1]);
      const documentId = z.string().uuid().parse(supportStatusMatch[2]);
      const input = updateAssemblySupportStatusSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<AssemblySupportDocument>((snapshot) => {
          const assemblyIndex = snapshot.assemblies.findIndex((item) => item.id === assemblyId);
          if (assemblyIndex < 0) {
            throw new DemoApiError("La asamblea no existe en esta copropiedad.", 404);
          }
          const assembly = normalizeAssembly(snapshot.assemblies[assemblyIndex]!);
          const document = assembly.dossier.documents.find((item) => item.id === documentId);
          if (!document?.filePath) {
            throw new DemoApiError("El soporte cargado no existe.", 404);
          }
          document.status = input.status;
          snapshot.assemblies[assemblyIndex] = assembly;
          return {
            action:
              input.status === "published"
                ? "asambleas.soporte_publicado"
                : input.status === "archived"
                  ? "asambleas.soporte_archivado"
                  : "asambleas.soporte_reactivado",
            detail: `${assembly.title}: ${document.name}, ${input.status}`,
            resource: document.id,
            result: document
          };
        })
      );
    }

    const petPhotoMatch = path.match(/^pets\/([0-9a-f-]+)\/photo$/i);
    if (petPhotoMatch) {
      const petId = z.string().uuid().parse(petPhotoMatch[1]);
      const input = updatePetPhotoSchema.parse(body);
      return NextResponse.json(await updateResidentPetPhoto(petId, input));
    }
    const petMatch = path.match(/^pets\/([0-9a-f-]+)$/i);
    if (petMatch) {
      const petId = z.string().uuid().parse(petMatch[1]);
      const input = updatePetStatusSchema.parse(body);
      return NextResponse.json(await updateResidentPetStatus(petId, input));
    }

    const personMatch = path.match(/^people\/([0-9a-f-]+)$/i);
    if (!personMatch) return problem("Ruta no encontrada.", 404);

    const personId = z.string().uuid().parse(personMatch[1]);
    const input = updateCommunityPersonSchema.parse(body);
    return NextResponse.json(
      await mutateDemoSnapshot<CommunityPerson>(async (snapshot, access) => {
        const person = snapshot.people.find((candidate) => candidate.id === personId);
        if (!person) throw new DemoApiError("La persona no existe en esta copropiedad.", 404);
        const { error: personError } = await access.supabase
          .schema("conjuntos")
          .from("personas")
          .update({
            nombre: input.name,
            tipo_identificacion: input.identificationType,
            numero_identificacion: input.identificationNumber
          })
          .eq("conjunto_id", access.conjuntoId)
          .eq("id", personId);
        if (personError) {
          if (personError.code === "23505") {
            throw new DemoApiError(
              "Ese número de identificación ya está registrado en la copropiedad.",
              409
            );
          }
          throw new DemoApiError("No fue posible actualizar la identificación de la persona.", 500);
        }
        Object.assign(person, input);
        return {
          action: "comunidad.persona_actualizada",
          detail: `${person.name}: ${person.unit}, ${person.contact}`,
          resource: person.id,
          result: person
        };
      })
    );
  } catch (error) {
    return handleError(error);
  }
}
