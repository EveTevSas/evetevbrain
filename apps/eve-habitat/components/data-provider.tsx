"use client";

import {
  DEMO_MERCHANT_ID,
  DEMO_TENANT_ID,
  DEMO_USER_ID,
  type CaseItem,
  type CreateCase,
  type CreateReservation,
  type CreateVisitor,
  type CreateWorkOrder,
  type DashboardSnapshot,
  type ExpenseItem,
  type FeeItem,
  type Payment,
  type ReconciliationResult,
  type ReservationItem,
  type VisitorItem,
  type WorkOrderItem
} from "@/lib/contracts";
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
  createCase: (input: CreateCase) => Promise<CaseItem | null>;
  createReservation: (input: CreateReservation) => Promise<ReservationItem | null>;
  createVisitor: (input: CreateVisitor) => Promise<VisitorItem | null>;
  createWorkOrder: (input: CreateWorkOrder) => Promise<WorkOrderItem | null>;
  approveExpense: (expenseId: string) => Promise<ExpenseItem | null>;
  payFee: (fee: FeeItem) => Promise<Payment | null>;
  reconcile: () => Promise<ReconciliationResult | null>;
  syncGatehouse: () => Promise<{ accepted: number; duplicates: number } | null>;
}

const STORAGE_KEY = "eve-habitat:snapshot:v1";
const GATEHOUSE_QUEUE_KEY = "eve-habitat:gatehouse-queue:v1";

function emptySnapshot(): DashboardSnapshot {
  return {
    tenant: {
      id: DEMO_TENANT_ID,
      name: "Eve-Habitat",
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
    cases: [],
    reservations: [],
    visitors: [],
    workOrders: [],
    expenses: [],
    announcements: [],
    assemblies: [],
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
    try {
      const next = await apiRequest<DashboardSnapshot>("/v1/habitat/snapshot");
      setSnapshot(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setConnection("online");
    } catch {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setSnapshot(JSON.parse(cached) as DashboardSnapshot);
        setConnection("cached");
      } else {
        setConnection("offline");
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onOnline = () => void refresh();
    const onOffline = () => setConnection((current) => (current === "online" ? "cached" : current));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
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
      createCase: (input) =>
        mutate(
          "case",
          () =>
            apiRequest<CaseItem>("/v1/habitat/cases", {
              method: "POST",
              body: JSON.stringify(input)
            }),
          "Caso creado"
        ),
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
          async () => {
            const payment = await apiRequest<Payment>("/v1/payments", {
              method: "POST",
              headers: { "idempotency-key": `web-${fee.id}-${crypto.randomUUID()}` },
              body: JSON.stringify({
                tenantId: DEMO_TENANT_ID,
                merchantId: DEMO_MERCHANT_ID,
                reference: fee.id,
                amountMinor: fee.balanceMinor,
                currency: "COP",
                description: fee.concept,
                returnUrl: "http://localhost:3000/finanzas"
              })
            });
            return apiRequest<Payment>(`/v1/payments/${payment.id}/sandbox/complete`, {
              method: "POST"
            });
          },
          "Pago aprobado y aplicado"
        ),
      reconcile: () =>
        mutate(
          "reconcile",
          () => apiRequest<ReconciliationResult>("/v1/reconciliation", { method: "POST" }),
          "Conciliación completada"
        ),
      syncGatehouse: () =>
        mutate(
          "gatehouse-sync",
          async () => {
            const existing = localStorage.getItem(GATEHOUSE_QUEUE_KEY);
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
            localStorage.removeItem(GATEHOUSE_QUEUE_KEY);
            return result;
          },
          "Portería sincronizada"
        )
    }),
    [busy, connection, mutate, refresh, snapshot, toast]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
}
