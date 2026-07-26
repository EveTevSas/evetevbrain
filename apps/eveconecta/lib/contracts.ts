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
  unit: string;
  kind: "owner" | "tenant" | "resident";
  contact: string;
  vehicles: number;
  pets: number;
  status: "active" | "invited";
}

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
  audience: string;
  channel: string;
  publishedAt: string;
  deliveryRate: number;
  status: "draft" | "scheduled" | "published";
}

export interface AssemblyItem {
  id: string;
  title: string;
  date: string;
  mode: string;
  quorumPercent: number;
  representedUnits: number;
  totalUnits: number;
  status: "scheduled" | "in_progress" | "closed";
  openVotes: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: string;
  version: number;
  updatedAt: string;
  visibility: "residents" | "council" | "administration";
  status: "current" | "expiring" | "archived";
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
  cases: CaseItem[];
  reservations: ReservationItem[];
  visitors: VisitorItem[];
  workOrders: WorkOrderItem[];
  expenses: ExpenseItem[];
  announcements: AnnouncementItem[];
  assemblies: AssemblyItem[];
  documents: DocumentItem[];
  audit: AuditEventItem[];
}

export const createCaseSchema = z.object({
  title: z.string().min(5).max(120),
  category: z.string().min(2).max(60),
  requester: z.string().min(3).max(100),
  unit: z.string().min(1).max(20),
  priority: z.enum(["low", "medium", "high"])
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

export const createWorkOrderSchema = z.object({
  asset: z.string().min(3).max(100),
  title: z.string().min(5).max(140),
  provider: z.string().min(3).max(100),
  scheduledDate: z.string().date(),
  estimatedMinor: z.number().int().nonnegative(),
  priority: z.enum(["routine", "important", "critical"])
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
export type CreateWorkOrder = z.infer<typeof createWorkOrderSchema>;
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
