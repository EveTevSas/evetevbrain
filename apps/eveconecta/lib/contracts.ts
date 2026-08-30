import { z } from "zod";

export const DEMO_TENANT_ID = "8f20f0e4-147d-4f1d-9e0d-8e9e1d923001";
export const DEMO_USER_ID = "8f20f0e4-147d-4f1d-9e0d-8e9e1d923101";
export const DEMO_MERCHANT_ID = "8f20f0e4-147d-4f1d-9e0d-8e9e1d923201";

export const tenantContextSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["administrator", "resident", "gatekeeper", "council", "auditor"])
});

export type TenantContext = z.infer<typeof tenantContextSchema>;

export const createMerchantSchema = z.object({
  legalName: z.string().min(3).max(160),
  provider: z.enum(["mock", "wompi", "akua"]).default("mock")
});

export type CreateMerchant = z.infer<typeof createMerchantSchema>;

export interface Merchant {
  id: string;
  tenantId: string;
  legalName: string;
  provider: "mock" | "wompi" | "akua";
  status: "pending" | "active" | "suspended";
  createdAt: string;
}

export const paymentStatusSchema = z.enum([
  "created",
  "pending",
  "approved",
  "declined",
  "voided",
  "refunded",
  "reconciled"
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const createPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  merchantId: z.string().uuid(),
  reference: z.string().min(6).max(80),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency: z.literal("COP"),
  description: z.string().min(3).max(180),
  returnUrl: z.string().url().optional()
});

export type CreatePayment = z.infer<typeof createPaymentSchema>;

export interface Payment {
  id: string;
  tenantId: string;
  merchantId: string;
  reference: string;
  amountMinor: number;
  currency: "COP";
  description: string;
  status: PaymentStatus;
  provider: "mock" | "wompi" | "akua";
  providerPaymentId: string;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerLine {
  account: string;
  direction: "debit" | "credit";
  amountMinor: number;
}

export interface LedgerEntry {
  id: string;
  tenantId: string;
  paymentId: string;
  kind: "payment_approved" | "payment_refunded" | "reconciliation_adjustment";
  lines: LedgerLine[];
  postedAt: string;
}

export interface Metric {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "neutral";
}

export interface PortfolioPoint {
  month: string;
  collected: number;
  billed: number;
}

export interface FeeItem {
  id: string;
  unit: string;
  resident: string;
  concept: string;
  dueDate: string;
  amountMinor: number;
  balanceMinor: number;
  status: "paid" | "pending" | "overdue";
}

export interface CommunityPerson {
  id: string;
  name: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  unit: string;
  kind: "owner" | "tenant" | "resident";
  contact: string;
  email?: string;
  phone?: string;
  vehicles: number;
  pets: number;
  status: "active" | "invited";
}

export const petTypeSchema = z.enum(["dog", "cat"]);
export type PetType = z.infer<typeof petTypeSchema>;

export const petSizeSchema = z.enum(["large", "medium", "small"]);
export type PetSize = z.infer<typeof petSizeSchema>;

export const petStatusSchema = z.enum(["active", "inactive"]);
export type PetStatus = z.infer<typeof petStatusSchema>;

export interface PetItem {
  id: string;
  personId: string;
  resident: string;
  unit: string;
  type: PetType;
  birthYear: number;
  size: PetSize;
  name: string;
  status: PetStatus;
  photoPath: string | null;
  createdAt: string;
}

export const identificationTypeSchema = z.enum([
  "cc",
  "ti",
  "ce",
  "passport",
  "ppt",
  "civil_registry",
  "nit",
  "other"
]);

export type IdentificationType = z.infer<typeof identificationTypeSchema>;

export const identificationTypeLabels: Record<IdentificationType, string> = {
  cc: "Cédula de ciudadanía",
  ti: "Tarjeta de identidad",
  ce: "Cédula de extranjería",
  passport: "Pasaporte",
  ppt: "Permiso por protección temporal",
  civil_registry: "Registro civil",
  nit: "NIT",
  other: "Otro"
};

export const updateCommunityPersonSchema = z.object({
  name: z.string().trim().min(3).max(100),
  identificationType: identificationTypeSchema,
  identificationNumber: z
    .string()
    .trim()
    .min(4)
    .max(30)
    .regex(/^[A-Za-z0-9][A-Za-z0-9.-]*$/),
  unit: z.string().trim().min(1).max(30),
  kind: z.enum(["owner", "tenant", "resident"]),
  contact: z.string().trim().min(5).max(200),
  vehicles: z.number().int().nonnegative().max(20),
  status: z.enum(["active", "invited"])
});

export type UpdateCommunityPerson = z.infer<typeof updateCommunityPersonSchema>;

export interface CaseItem {
  id: string;
  code: string;
  title: string;
  category: string;
  requester: string;
  unit: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  slaHours: number;
  elapsedHours: number;
  createdAt: string;
  imagePaths?: string[];
}

export interface ReservationItem {
  id: string;
  amenity: string;
  date: string;
  time: string;
  resident: string;
  unit: string;
  amountMinor: number;
  status: "confirmed" | "pending" | "cancelled";
}

export interface VisitorItem {
  id: string;
  name: string;
  documentSuffix: string;
  unit: string;
  vehiclePlate: string | null;
  validFrom: string;
  validUntil: string;
  status: "expected" | "inside" | "departed" | "expired";
  accessCode: string;
  offlineCreated: boolean;
}

export const parkingSpotKindSchema = z.enum(["zone", "unit"]);
export type ParkingSpotKind = z.infer<typeof parkingSpotKindSchema>;

export const parkingSpotStatusSchema = z.enum(["available", "assigned", "maintenance"]);
export type ParkingSpotStatus = z.infer<typeof parkingSpotStatusSchema>;

export interface ParkingSpotItem {
  id: string;
  code: string;
  kind: ParkingSpotKind;
  sector: string | null;
  number: string;
  linkedUnit: string | null;
  assignedUnit: string | null;
  assignedVehicleId: string | null;
  status: ParkingSpotStatus;
}

export const vehicleAccessStatusSchema = z.enum(["authorized", "suspended", "expired"]);
export type VehicleAccessStatus = z.infer<typeof vehicleAccessStatusSchema>;

export interface RegisteredVehicleItem {
  id: string;
  plate: string;
  kind: "car" | "motorcycle" | "other";
  brand: string;
  color: string;
  personId: string;
  resident: string;
  unit: string;
  parkingSpotId: string | null;
  parkingCode: string | null;
  accessStatus: VehicleAccessStatus;
  validFrom: string;
  validUntil: string | null;
}

export interface VehicleAccessEventItem {
  id: string;
  plate: string;
  direction: "entry" | "exit";
  decision: "authorized" | "denied";
  reason:
    | "registered_vehicle"
    | "authorized_visitor"
    | "suspended_vehicle"
    | "expired_vehicle"
    | "expired_visitor"
    | "unknown_vehicle";
  source: "permanent" | "visitor" | "unknown";
  unit: string | null;
  parkingCode: string | null;
  occurredAt: string;
}

export interface VehicleAccessResult {
  allowed: boolean;
  message: string;
  event: VehicleAccessEventItem;
}

export interface WorkOrderItem {
  id: string;
  code: string;
  asset: string;
  title: string;
  provider: string;
  scheduledDate: string;
  estimatedMinor: number;
  status: "planned" | "in_progress" | "completed" | "overdue";
  priority: "routine" | "important" | "critical";
}

export interface ExpenseItem {
  id: string;
  concept: string;
  provider: string;
  providerIdentification: string;
  budgetLine: string;
  amountMinor: number;
  requestedBy: string;
  approvals: number;
  approvalsRequired: number;
  status: "draft" | "pending_approval" | "approved" | "paid";
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  audience: string;
  channel: string;
  publishedAt: string;
  deliveryRate: number;
  status: "draft" | "scheduled" | "published";
}

export const announcementAudienceSchema = z.enum([
  "all_residents",
  "owners",
  "residents_with_pets"
]);

export const announcementChannelSchema = z.enum(["app", "email", "whatsapp"]);

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    message: z.string().trim().min(10).max(2000),
    audience: announcementAudienceSchema,
    channels: z.array(announcementChannelSchema).min(1).max(3),
    publicationMode: z.enum(["publish_now", "schedule", "draft"]),
    scheduledAt: z.string().datetime().nullable()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.publicationMode === "schedule") {
      if (!value.scheduledAt) {
        context.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "Indica la fecha y hora de publicación."
        });
      } else if (new Date(value.scheduledAt).getTime() <= Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "La publicación programada debe estar en el futuro."
        });
      }
    }
  });

export interface AssemblyItem {
  id: string;
  title: string;
  date: string;
  mode: string;
  type?: "ordinary" | "extraordinary" | "informative";
  location?: string;
  agenda?: string;
  quorumPercent: number;
  representedUnits: number;
  totalUnits: number;
  status: "scheduled" | "in_progress" | "closed";
  openVotes: number;
  dossier?: AssemblyDossier;
}

export const assemblyTypeSchema = z.enum(["ordinary", "extraordinary", "informative"]);
export const assemblyModeSchema = z.enum(["in_person", "virtual", "hybrid"]);
export const assemblyStageSchema = z.enum([
  "preparation",
  "convocation",
  "registration",
  "live",
  "minutes",
  "follow_up"
]);
export const assemblyCapabilitySchema = z.enum([
  "document_repository",
  "delivery_tracking",
  "proxy_management",
  "identity_accreditation",
  "continuous_quorum",
  "unit_voting",
  "coefficient_voting",
  "qualified_majorities",
  "secret_ballots",
  "hybrid_participation",
  "resident_questions",
  "minutes_workflow",
  "decision_tracking"
]);

export type AssemblyStage = z.infer<typeof assemblyStageSchema>;
export type AssemblyCapability = z.infer<typeof assemblyCapabilitySchema>;
export type AssemblyCapabilities = Record<AssemblyCapability, boolean>;

export interface AssemblySettings {
  capabilities: AssemblyCapabilities;
  updatedAt?: string;
}

export interface AssemblyChecklistItem {
  id: string;
  stage: AssemblyStage;
  label: string;
  completed: boolean;
  capability?: AssemblyCapability;
}

export interface AssemblyAgendaItem {
  id: string;
  title: string;
  decisionType: "informative" | "economic" | "non_economic" | "qualified";
  votingRule: "none" | "unit" | "coefficient" | "qualified_coefficient";
  thresholdPercent: number | null;
  status: "draft" | "ready" | "voted";
}

export interface AssemblyVoteItem {
  id: string;
  title: string;
  rule: "unit" | "coefficient" | "qualified_coefficient";
  thresholdPercent: number;
  status: "draft" | "open" | "closed";
  yesPercent: number;
  noPercent: number;
  abstentionPercent: number;
}

export interface AssemblyDecisionItem {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
}

export interface AssemblySupportDocument {
  id: string;
  name: string;
  category: string;
  agendaItemId: string | null;
  version: number;
  status: "pending" | "ready" | "published" | "archived";
  filePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export interface AssemblyConvocationRecipient {
  personId: string;
  name: string;
  unit: string;
  email: string;
  phone: string;
  emailStatus: "not_sent" | "queued" | "sent" | "delivered" | "opened" | "failed";
  emailUpdatedAt: string | null;
  whatsappStatus: "pending_integration";
}

export interface AssemblyDossier {
  currentStage: AssemblyStage;
  callType: "first" | "second";
  propertyUse: "residential" | "mixed";
  agendaLocked: boolean;
  delivery: {
    sent: number;
    delivered: number;
    opened: number;
  };
  convocationRecipients: AssemblyConvocationRecipient[];
  representedCoefficientPercent: number;
  validatedProxies: number;
  residentsWithoutVote: number;
  checklist: AssemblyChecklistItem[];
  agendaItems: AssemblyAgendaItem[];
  documents: AssemblySupportDocument[];
  votes: AssemblyVoteItem[];
  minutes: {
    version: number;
    status: "not_started" | "draft" | "in_review" | "published";
    signaturesCompleted: number;
    signaturesRequired: number;
    publishedAt: string | null;
  };
  decisions: AssemblyDecisionItem[];
}

export const scheduleAssemblySchema = z
  .object({
    title: z.string().trim().min(5).max(140),
    type: assemblyTypeSchema,
    mode: assemblyModeSchema,
    callType: z.enum(["first", "second"]).default("first"),
    propertyUse: z.enum(["residential", "mixed"]).default("residential"),
    startsAt: z.string().datetime(),
    location: z.string().trim().min(3).max(240),
    agenda: z.string().trim().min(10).max(3000)
  })
  .strict()
  .superRefine((value, context) => {
    if (new Date(value.startsAt).getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "La asamblea debe programarse para una fecha futura."
      });
    }
    if (value.mode === "virtual" && !/^https:\/\//i.test(value.location)) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Indica un enlace HTTPS para la asamblea virtual."
      });
    }
  });

const assemblyCapabilitiesShape = Object.fromEntries(
  assemblyCapabilitySchema.options.map((capability) => [capability, z.boolean()])
) as Record<AssemblyCapability, z.ZodBoolean>;

export const updateAssemblyCapabilitiesSchema = z
  .object({ capabilities: z.object(assemblyCapabilitiesShape).partial() })
  .strict();

export const updateAssemblyChecklistSchema = z
  .object({
    checklistItemId: z.string().trim().min(2).max(80),
    completed: z.boolean()
  })
  .strict();

export const sendAssemblyEmailConvocationSchema = z
  .object({
    personIds: z.array(z.string().uuid()).min(1).max(500)
  })
  .strict();

export const assemblySupportPathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/v[1-9][0-9]*\.(pdf|docx|xlsx|jpg|png)$/,
    "La ruta del soporte no es válida."
  );

export const createAssemblySupportSchema = z
  .object({
    documentId: z.string().uuid(),
    name: z.string().trim().min(3).max(180),
    category: z.enum([
      "management_report",
      "financial_statements",
      "budget",
      "proposal",
      "legal",
      "other"
    ]),
    agendaItemId: z.string().trim().min(2).max(80).nullable(),
    version: z.number().int().positive().max(999),
    filePath: assemblySupportPathSchema,
    mimeType: z.enum([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png"
    ]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024)
  })
  .strict();

export const updateAssemblySupportStatusSchema = z
  .object({ status: z.enum(["ready", "published", "archived"]) })
  .strict();

export interface DocumentItem {
  id: string;
  name: string;
  category: string;
  version: number;
  updatedAt: string;
  visibility: "residents" | "council" | "administration";
  status: "current" | "expiring" | "archived";
  downloadPath?: string;
}

export interface AuditEventItem {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  resource: string;
  detail: string;
  result: "success" | "denied";
}

export interface DashboardSnapshot {
  tenant: {
    id: string;
    name: string;
    nit: string;
    city: string;
    units: number;
    occupancyPercent: number;
  };
  currentUser: {
    id: string;
    name: string;
    role: string;
    initials: string;
  };
  metrics: Metric[];
  portfolio: PortfolioPoint[];
  fees: FeeItem[];
  people: CommunityPerson[];
  pets: PetItem[];
  cases: CaseItem[];
  reservations: ReservationItem[];
  visitors: VisitorItem[];
  parkingSpots: ParkingSpotItem[];
  vehicles: RegisteredVehicleItem[];
  vehicleAccessEvents: VehicleAccessEventItem[];
  workOrders: WorkOrderItem[];
  expenses: ExpenseItem[];
  announcements: AnnouncementItem[];
  assemblies: AssemblyItem[];
  assemblySettings?: AssemblySettings;
  documents: DocumentItem[];
  audit: AuditEventItem[];
}

export const caseImagePathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[1-3]\.(jpg|png|webp)$/,
    "La ruta de una imagen del caso no es válida."
  );

export const createCaseSchema = z.object({
  title: z.string().min(5).max(120),
  category: z.string().min(2).max(60),
  requester: z.string().min(3).max(100),
  unit: z.string().min(1).max(20),
  priority: z.enum(["low", "medium", "high"]),
  imagePaths: z.array(caseImagePathSchema).max(3, "Puedes anexar máximo 3 imágenes.").optional()
});

export const createReservationSchema = z.object({
  amenity: z.string().min(2).max(80),
  date: z.string().date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  resident: z.string().min(3).max(100),
  unit: z.string().min(1).max(20)
});

export const createVisitorSchema = z.object({
  name: z.string().min(3).max(100),
  documentSuffix: z.string().regex(/^\d{4}$/),
  unit: z.string().min(1).max(20),
  vehiclePlate: z.string().max(8).nullable(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime()
});

export const createPetSchema = z.object({
  type: petTypeSchema,
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  size: petSizeSchema,
  name: z.string().trim().min(2).max(60),
  status: petStatusSchema.default("active")
});

export const updatePetStatusSchema = z.object({
  status: petStatusSchema
});

export const updatePetPhotoSchema = z.object({
  photoPath: z
    .string()
    .max(240)
    .regex(
      /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/perfil\.(?:jpg|png|webp)$/,
      "La ruta de la foto no es válida."
    )
});

const normalizedCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/);

export const createParkingSpotSchema = z
  .object({
    code: normalizedCodeSchema,
    kind: parkingSpotKindSchema,
    sector: z.string().trim().min(1).max(20).nullable(),
    number: z.string().trim().min(1).max(12),
    linkedUnit: z.string().trim().min(1).max(30).nullable(),
    status: parkingSpotStatusSchema.default("available")
  })
  .superRefine((value, context) => {
    if (value.kind === "zone" && !value.sector) {
      context.addIssue({
        code: "custom",
        path: ["sector"],
        message: "Indica la zona, lote o manzana del parqueadero."
      });
    }
    if (value.kind === "unit" && !value.linkedUnit) {
      context.addIssue({
        code: "custom",
        path: ["linkedUnit"],
        message: "Indica la casa o unidad a la que pertenece el parqueadero."
      });
    }
  });

export const createRegisteredVehicleSchema = z
  .object({
    plate: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{5,8}$/),
    kind: z.enum(["car", "motorcycle", "other"]),
    brand: z.string().trim().min(2).max(40),
    color: z.string().trim().min(2).max(30),
    validUntil: z.string().date().nullable()
  })
  .strict();

export const registerVehicleAccessSchema = z.object({
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{5,8}$/),
  direction: z.enum(["entry", "exit"])
});

export const createWorkOrderSchema = z.object({
  asset: z.string().min(3).max(100),
  title: z.string().min(5).max(140),
  provider: z.string().min(3).max(100),
  scheduledDate: z.string().date(),
  estimatedMinor: z.number().int().nonnegative(),
  priority: z.enum(["routine", "important", "critical"])
});

export const createExpenseSchema = z.object({
  concept: z.string().min(5).max(160),
  provider: z.string().min(3).max(120),
  providerIdentification: z.string().trim().min(3).max(30),
  budgetLine: z.enum([
    "Servicios generales",
    "Mantenimiento",
    "Seguridad",
    "Seguros",
    "Mejoras",
    "Imprevistos"
  ]),
  amountMinor: z.number().int().positive().max(2_000_000_000)
});

export const castVoteSchema = z.object({
  assemblyId: z.string().min(1),
  questionId: z.string().min(1).max(80),
  unitId: z.string().min(1).max(80),
  coefficient: z.number().positive().max(1),
  choice: z.string().min(1).max(80)
});

export const dataSubjectRequestSchema = z.object({
  requestType: z.enum(["access", "correction", "deletion", "revocation"]),
  requesterName: z.string().min(3).max(120),
  requesterContact: z.string().min(5).max(160),
  description: z.string().min(10).max(1_000)
});

export const feeAssessmentRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  concept: z.string().min(3).max(100),
  baseAmountMinor: z.number().int().positive()
});

export type CreateCase = z.infer<typeof createCaseSchema>;
export type CreateReservation = z.infer<typeof createReservationSchema>;
export type CreateVisitor = z.infer<typeof createVisitorSchema>;
export type CreatePet = z.infer<typeof createPetSchema>;
export type UpdatePetStatus = z.infer<typeof updatePetStatusSchema>;
export type UpdatePetPhoto = z.infer<typeof updatePetPhotoSchema>;
export type CreateParkingSpot = z.infer<typeof createParkingSpotSchema>;
export type CreateRegisteredVehicle = z.infer<typeof createRegisteredVehicleSchema>;
export type RegisterVehicleAccess = z.infer<typeof registerVehicleAccessSchema>;
export type CreateWorkOrder = z.infer<typeof createWorkOrderSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;
export type ScheduleAssembly = z.infer<typeof scheduleAssemblySchema>;
export type UpdateAssemblyCapabilities = z.infer<typeof updateAssemblyCapabilitiesSchema>;
export type UpdateAssemblyChecklist = z.infer<typeof updateAssemblyChecklistSchema>;
export type SendAssemblyEmailConvocation = z.infer<typeof sendAssemblyEmailConvocationSchema>;
export type CreateAssemblySupport = z.infer<typeof createAssemblySupportSchema>;
export type UpdateAssemblySupportStatus = z.infer<typeof updateAssemblySupportStatusSchema>;
export type CastVote = z.infer<typeof castVoteSchema>;
export type DataSubjectRequestInput = z.infer<typeof dataSubjectRequestSchema>;
export type FeeAssessmentRun = z.infer<typeof feeAssessmentRunSchema>;

export interface ReconciliationResult {
  runId: string;
  checkedPayments: number;
  reconciledPayments: number;
  discrepancies: number;
  completedAt: string;
}

export function formatCop(amountMinor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(amountMinor / 100);
}
