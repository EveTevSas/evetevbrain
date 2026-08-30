"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  DEMO_TENANT_ID,
  DEMO_USER_ID,
  type AnnouncementItem,
  type AssemblySettings,
  type AssemblyItem,
  type AssemblySupportDocument,
  type CaseItem,
  type CommunityPerson,
  type CreateCase,
  type CreateAnnouncement,
  type CreateAssemblySupport,
  type CreateExpense,
  type CreateParkingSpot,
  type CreatePet,
  type CreateRegisteredVehicle,
  type CreateReservation,
  type CreateVisitor,
  type CreateWorkOrder,
  type DashboardSnapshot,
  type ExpenseItem,
  type FeeItem,
  type Payment,
  type ParkingSpotItem,
  type PetItem,
  type ReconciliationResult,
  type ReservationItem,
  type ScheduleAssembly,
  type SendAssemblyEmailConvocation,
  type RegisteredVehicleItem,
  type RegisterVehicleAccess,
  type UpdateCommunityPerson,
  type UpdateAssemblyCapabilities,
  type UpdateAssemblyChecklist,
  type UpdateAssemblySupportStatus,
  type UpdatePetStatus,
  type VisitorItem,
  type VehicleAccessResult,
  type WorkOrderItem
} from "@/lib/contracts";
import { DEFAULT_ASSEMBLY_CAPABILITIES } from "@/lib/assemblies";
import {
  ASSEMBLY_SUPPORT_BUCKET,
  assemblySupportPath,
  validateAssemblySupport
} from "@/lib/assembly-supports";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiRequest } from "../lib/api";
import { CASE_IMAGE_BUCKET, caseImagePath, validateCaseImages } from "../lib/case-images";
import { PET_PHOTO_BUCKET, petPhotoPath, validatePetPhoto } from "../lib/pet-photo";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type ConnectionState = "loading" | "online" | "cached" | "offline";

interface ToastMessage {
  id: number;
  title: string;
  detail: string;
  tone: "success" | "error" | "info";
}

interface DataContextValue {
  snapshot: DashboardSnapshot;
  connection: ConnectionState;
  busy: string | null;
  toast: ToastMessage | null;
  refresh: () => Promise<void>;
  dismissToast: () => void;
  createCase: (input: CreateCase, images?: File[]) => Promise<CaseItem | null>;
  createAnnouncement: (input: CreateAnnouncement) => Promise<AnnouncementItem | null>;
  scheduleAssembly: (input: ScheduleAssembly) => Promise<AssemblyItem | null>;
  updateAssemblyCapabilities: (
    input: UpdateAssemblyCapabilities
  ) => Promise<AssemblySettings | null>;
  updateAssemblyChecklist: (
    assemblyId: string,
    input: UpdateAssemblyChecklist
  ) => Promise<AssemblyItem | null>;
  sendAssemblyEmailConvocation: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
  uploadAssemblySupport: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  updateAssemblySupportStatus: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  downloadAssemblySupport: (document: AssemblySupportDocument) => Promise<void>;
  createReservation: (input: CreateReservation) => Promise<ReservationItem | null>;
  createVisitor: (input: CreateVisitor) => Promise<VisitorItem | null>;
  createParkingSpot: (input: CreateParkingSpot) => Promise<ParkingSpotItem | null>;
  createPet: (input: CreatePet, photo?: File) => Promise<PetItem | null>;
  createVehicle: (input: CreateRegisteredVehicle) => Promise<RegisteredVehicleItem | null>;
  registerVehicleAccess: (input: RegisterVehicleAccess) => Promise<VehicleAccessResult | null>;
  createWorkOrder: (input: CreateWorkOrder) => Promise<WorkOrderItem | null>;
  createExpense: (input: CreateExpense) => Promise<ExpenseItem | null>;
  updatePerson: (personId: string, input: UpdateCommunityPerson) => Promise<CommunityPerson | null>;
  updatePetPhoto: (pet: PetItem, photo: File) => Promise<PetItem | null>;
  updatePetStatus: (petId: string, input: UpdatePetStatus) => Promise<PetItem | null>;
  approveExpense: (expenseId: string) => Promise<ExpenseItem | null>;
  payFee: (fee: FeeItem) => Promise<Payment | null>;
  reconcile: () => Promise<ReconciliationResult | null>;
  syncGatehouse: () => Promise<{ accepted: number; duplicates: number } | null>;
}

const SNAPSHOT_STORAGE_PREFIX = "eveconecta:snapshot:v2";
const GATEHOUSE_QUEUE_PREFIX = "eveconecta:gatehouse-queue:v2";

function scopedStorageKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

function emptySnapshot(): DashboardSnapshot {
  return {
    tenant: {
      id: DEMO_TENANT_ID,
      name: "EveConecta",
      nit: "—",
      city: "Colombia",
      units: 0,
      occupancyPercent: 0
    },
    currentUser: {
      id: DEMO_USER_ID,
      name: "Camila Herrera",
      role: "Administradora",
      initials: "CH"
    },
    metrics: [],
    portfolio: [],
    fees: [],
    people: [],
    pets: [],
    cases: [],
    reservations: [],
    visitors: [],
    parkingSpots: [],
    vehicles: [],
    vehicleAccessEvents: [],
    workOrders: [],
    expenses: [],
    announcements: [],
    assemblies: [],
    assemblySettings: { capabilities: { ...DEFAULT_ASSEMBLY_CAPABILITIES } },
    documents: [],
    audit: []
  };
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((title: string, detail: string, tone: ToastMessage["tone"]) => {
    setToast({ id: Date.now(), title, detail, tone });
  }, []);

  const refresh = useCallback(async () => {
    const {
      data: { session }
    } = await getSupabaseBrowserClient().auth.getSession();
    if (!session) {
      setSnapshot(emptySnapshot());
      setConnection("offline");
      return;
    }
    const storageKey = scopedStorageKey(SNAPSHOT_STORAGE_PREFIX, session.user.id);

    try {
      const next = await apiRequest<DashboardSnapshot>("/v1/habitat/snapshot");
      setSnapshot(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setConnection("online");
    } catch {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        setSnapshot(JSON.parse(cached) as DashboardSnapshot);
        setConnection("cached");
      } else {
        setSnapshot(emptySnapshot());
        setConnection("offline");
      }
    }
  }, []);

  const uploadPetPhoto = useCallback(
    async (pet: PetItem, photo: File): Promise<PetItem> => {
      const validationError = validatePetPhoto(photo);
      if (validationError) throw new Error(validationError);

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Debes iniciar sesión para subir la foto.");

      const path = petPhotoPath(snapshot.tenant.id, session.user.id, pet.id, photo.type);
      const { error: uploadError } = await supabase.storage
        .from(PET_PHOTO_BUCKET)
        .upload(path, photo, { cacheControl: "3600", contentType: photo.type, upsert: true });
      if (uploadError) throw new Error("No fue posible almacenar la foto de la mascota.");

      try {
        const updated = await apiRequest<PetItem>(`/v1/habitat/pets/${pet.id}/photo`, {
          method: "PATCH",
          body: JSON.stringify({ photoPath: path })
        });
        if (pet.photoPath && pet.photoPath !== path) {
          await supabase.storage.from(PET_PHOTO_BUCKET).remove([pet.photoPath]);
        }
        return updated;
      } catch (error) {
        if (pet.photoPath !== path) {
          await supabase.storage.from(PET_PHOTO_BUCKET).remove([path]);
        }
        throw error;
      }
    },
    [snapshot.tenant.id]
  );

  const createCaseWithImages = useCallback(
    async (input: CreateCase, images: File[] = []): Promise<CaseItem> => {
      const validationError = validateCaseImages(images);
      if (validationError) throw new Error(validationError);

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Debes iniciar sesión para crear el caso.");

      const uploadId = crypto.randomUUID();
      const uploadedPaths: string[] = [];

      try {
        for (const [index, image] of images.entries()) {
          const path = caseImagePath(
            snapshot.tenant.id,
            session.user.id,
            uploadId,
            index + 1,
            image.type
          );
          const { error } = await supabase.storage.from(CASE_IMAGE_BUCKET).upload(path, image, {
            cacheControl: "3600",
            contentType: image.type,
            upsert: false
          });
          if (error) throw new Error("No fue posible almacenar las imágenes del caso.");
          uploadedPaths.push(path);
        }

        return await apiRequest<CaseItem>("/v1/habitat/cases", {
          method: "POST",
          body: JSON.stringify({ ...input, imagePaths: uploadedPaths })
        });
      } catch (error) {
        if (uploadedPaths.length) {
          await supabase.storage.from(CASE_IMAGE_BUCKET).remove(uploadedPaths);
        }
        throw error;
      }
    },
    [snapshot.tenant.id]
  );

  const uploadAssemblySupportFile = useCallback(
    async (
      assemblyId: string,
      input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
      file: File
    ): Promise<AssemblySupportDocument> => {
      const validationError = validateAssemblySupport(file);
      if (validationError) throw new Error(validationError);

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Debes iniciar sesión para subir el soporte.");

      const path = assemblySupportPath(
        snapshot.tenant.id,
        assemblyId,
        input.documentId,
        input.version,
        file.type
      );
      const { error: uploadError } = await supabase.storage
        .from(ASSEMBLY_SUPPORT_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });
      if (uploadError) throw new Error("No fue posible almacenar el soporte en Supabase.");

      try {
        return await apiRequest<AssemblySupportDocument>(
          `/v1/habitat/assemblies/${assemblyId}/supports`,
          {
            method: "POST",
            body: JSON.stringify({
              ...input,
              filePath: path,
              mimeType: file.type,
              sizeBytes: file.size
            })
          }
        );
      } catch (error) {
        await supabase.storage.from(ASSEMBLY_SUPPORT_BUCKET).remove([path]);
        throw error;
      }
    },
    [snapshot.tenant.id]
  );

  useEffect(() => {
    void refresh();
    const onOnline = () => void refresh();
    const onOffline = () => setConnection((current) => (current === "online" ? "cached" : current));
    const {
      data: { subscription }
    } = getSupabaseBrowserClient().auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT" || !session) {
          setSnapshot(emptySnapshot());
          setConnection("offline");
          return;
        }
        if (event === "SIGNED_IN") {
          window.setTimeout(() => void refresh(), 0);
        }
      }
    );
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const mutate = useCallback(
    async <T,>(key: string, action: () => Promise<T>, success: string): Promise<T | null> => {
      setBusy(key);
      try {
        const result = await action();
        await refresh();
        notify(success, "El cambio quedó registrado en la auditoría.", "success");
        return result;
      } catch (error) {
        notify(
          "No se pudo completar",
          error instanceof Error ? error.message : "Revisa los datos e inténtalo nuevamente.",
          "error"
        );
        return null;
      } finally {
        setBusy(null);
      }
    },
    [notify, refresh]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      snapshot,
      connection,
      busy,
      toast,
      refresh,
      dismissToast: () => setToast(null),
      createAnnouncement: (input) =>
        mutate(
          "announcement-create",
          () =>
            apiRequest<AnnouncementItem>("/v1/habitat/announcements", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          input.publicationMode === "publish_now"
            ? "Comunicado publicado"
            : input.publicationMode === "schedule"
              ? "Comunicado programado"
              : "Borrador guardado"
        ),
      scheduleAssembly: (input) =>
        mutate(
          "assembly-schedule",
          () =>
            apiRequest<AssemblyItem>("/v1/habitat/assemblies", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Asamblea programada"
        ),
      updateAssemblyCapabilities: (input) =>
        mutate(
          "assembly-settings",
          () =>
            apiRequest<AssemblySettings>("/v1/habitat/assembly-settings", {
              method: "PATCH",
              body: JSON.stringify(input)
            }),
          "Funcionalidades actualizadas"
        ),
      updateAssemblyChecklist: (assemblyId, input) =>
        mutate(
          `assembly-checklist-${input.checklistItemId}`,
          () =>
            apiRequest<AssemblyItem>(`/v1/habitat/assemblies/${assemblyId}/checklist`, {
              method: "PATCH",
              body: JSON.stringify(input)
            }),
          input.completed ? "Actividad completada" : "Actividad reabierta"
        ),
      sendAssemblyEmailConvocation: (assemblyId, input) =>
        mutate(
          `assembly-convocation-email-${assemblyId}`,
          () =>
            apiRequest<AssemblyItem>(`/v1/habitat/assemblies/${assemblyId}/convocations/email`, {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Convocatoria registrada en la cola de email"
        ),
      uploadAssemblySupport: (assemblyId, input, file) =>
        mutate(
          `assembly-support-${input.documentId}`,
          () => uploadAssemblySupportFile(assemblyId, input, file),
          input.version > 1 ? "Nueva versión registrada" : "Soporte cargado"
        ),
      updateAssemblySupportStatus: (assemblyId, documentId, input) =>
        mutate(
          `assembly-support-status-${documentId}`,
          () =>
            apiRequest<AssemblySupportDocument>(
              `/v1/habitat/assemblies/${assemblyId}/supports/${documentId}/status`,
              { method: "PATCH", body: JSON.stringify(input) }
            ),
          input.status === "published"
            ? "Soporte publicado"
            : input.status === "archived"
              ? "Soporte archivado"
              : "Soporte reactivado"
        ),
      downloadAssemblySupport: async (document) => {
        if (!document.filePath) {
          notify(
            "Archivo no disponible",
            "Este registro demostrativo no tiene un archivo almacenado.",
            "info"
          );
          return;
        }
        const { data, error } = await getSupabaseBrowserClient()
          .storage.from(ASSEMBLY_SUPPORT_BUCKET)
          .createSignedUrl(document.filePath, 60, { download: document.name });
        if (error || !data?.signedUrl) {
          notify("No se pudo descargar", "El enlace privado no pudo generarse.", "error");
          return;
        }
        const link = window.document.createElement("a");
        link.href = data.signedUrl;
        link.download = document.name;
        link.rel = "noopener noreferrer";
        link.click();
      },
      createCase: (input, images) =>
        mutate("case", () => createCaseWithImages(input, images), "Caso creado"),
      createReservation: (input) =>
        mutate(
          "reservation",
          () =>
            apiRequest<ReservationItem>("/v1/habitat/reservations", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Reserva confirmada"
        ),
      createVisitor: (input) =>
        mutate(
          "visitor",
          () =>
            apiRequest<VisitorItem>("/v1/habitat/visitors", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Visitante autorizado"
        ),
      createParkingSpot: (input) =>
        mutate(
          "parking-create",
          () =>
            apiRequest<ParkingSpotItem>("/v1/habitat/parking-spots", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Parqueadero registrado"
        ),
      createPet: (input, photo) =>
        mutate(
          "pet-create",
          async () => {
            const pet = await apiRequest<PetItem>("/v1/habitat/pets", {
              method: "POST",
              body: JSON.stringify(input)
            });
            return photo ? uploadPetPhoto(pet, photo) : pet;
          },
          "Mascota registrada"
        ),
      createVehicle: (input) =>
        mutate(
          "vehicle-create",
          () =>
            apiRequest<RegisteredVehicleItem>("/v1/habitat/vehicles", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Vehículo registrado"
        ),
      registerVehicleAccess: (input) =>
        mutate(
          "vehicle-access",
          () =>
            apiRequest<VehicleAccessResult>("/v1/habitat/gatehouse/vehicle-accesses", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Validación de acceso registrada"
        ),
      createWorkOrder: (input) =>
        mutate(
          "work-order",
          () =>
            apiRequest<WorkOrderItem>("/v1/habitat/work-orders", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Orden de trabajo creada"
        ),
      createExpense: (input) =>
        mutate(
          "expense-create",
          () =>
            apiRequest<ExpenseItem>("/v1/habitat/expenses", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Gasto registrado"
        ),
      updatePerson: (personId, input) =>
        mutate(
          `person-${personId}`,
          () =>
            apiRequest<CommunityPerson>(`/v1/habitat/people/${personId}`, {
              method: "PATCH",
              body: JSON.stringify(input)
            }),
          "Registro actualizado"
        ),
      updatePetPhoto: (pet, photo) =>
        mutate(
          `pet-photo-${pet.id}`,
          () => uploadPetPhoto(pet, photo),
          "Foto de la mascota actualizada"
        ),
      updatePetStatus: (petId, input) =>
        mutate(
          `pet-${petId}`,
          () =>
            apiRequest<PetItem>(`/v1/habitat/pets/${petId}`, {
              method: "PATCH",
              body: JSON.stringify(input)
            }),
          input.status === "active" ? "Mascota reactivada" : "Mascota inactivada"
        ),
      approveExpense: (expenseId) =>
        mutate(
          `expense-${expenseId}`,
          () =>
            apiRequest<ExpenseItem>(`/v1/habitat/expenses/${expenseId}/approve`, {
              method: "POST"
            }),
          "Aprobación registrada"
        ),
      payFee: (fee) =>
        mutate(
          `fee-${fee.id}`,
          () =>
            apiRequest<Payment>(`/v1/habitat/fees/${fee.id}/pay-demo`, {
              method: "POST"
            }),
          "Pago aprobado y aplicado"
        ),
      reconcile: () =>
        mutate(
          "reconcile",
          () => apiRequest<ReconciliationResult>("/v1/habitat/reconciliation", { method: "POST" }),
          "Conciliación completada"
        ),
      syncGatehouse: () =>
        mutate(
          "gatehouse-sync",
          async () => {
            const {
              data: { session }
            } = await getSupabaseBrowserClient().auth.getSession();
            if (!session) {
              throw new Error("Debes iniciar sesión para sincronizar portería.");
            }
            const queueKey = scopedStorageKey(GATEHOUSE_QUEUE_PREFIX, session.user.id);
            const existing = localStorage.getItem(queueKey);
            const queue = existing
              ? (JSON.parse(existing) as Array<Record<string, string>>)
              : [
                  {
                    clientEventId: crypto.randomUUID(),
                    deviceId: "PORTERIA-01",
                    eventType: "shift_note",
                    occurredAt: new Date().toISOString()
                  }
                ];
            const result = await apiRequest<{ accepted: number; duplicates: number }>(
              "/v1/habitat/gatehouse/sync",
              { method: "POST", body: JSON.stringify({ events: queue }) }
            );
            localStorage.removeItem(queueKey);
            return result;
          },
          "Portería sincronizada"
        )
    }),
    [
      busy,
      connection,
      createCaseWithImages,
      mutate,
      notify,
      refresh,
      snapshot,
      toast,
      uploadAssemblySupportFile,
      uploadPetPhoto
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
}
