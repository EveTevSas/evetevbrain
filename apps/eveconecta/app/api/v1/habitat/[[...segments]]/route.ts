import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, z } from "zod";
import {
  createCaseSchema,
  createReservationSchema,
  createVisitorSchema,
  createWorkOrderSchema,
  type CaseItem,
  type ExpenseItem,
  type Payment,
  type ReconciliationResult,
  type ReservationItem,
  type VisitorItem,
  type WorkOrderItem
} from "@/lib/contracts";
import { ACTIVE_CONJUNTO_COOKIE } from "@/lib/auth/tenant-cookie";
import {
  canSelectConjunto,
  DemoApiError,
  getDemoSnapshot,
  mutateDemoSnapshot
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

    if (path === "cases") {
      const input = createCaseSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<CaseItem>((snapshot) => {
          const item: CaseItem = {
            id: crypto.randomUUID(),
            code: nextCode("PQRS", snapshot.cases.length),
            ...input,
            status: "open",
            slaHours: input.priority === "high" ? 8 : input.priority === "medium" ? 24 : 48,
            elapsedHours: 0,
            createdAt: new Date().toISOString()
          };
          snapshot.cases.unshift(item);
          return {
            action: "pqrs.caso_creado",
            detail: `${item.code}: ${item.title}`,
            resource: item.code,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    if (path === "reservations") {
      const input = createReservationSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<ReservationItem>((snapshot) => {
          const item: ReservationItem = {
            id: crypto.randomUUID(),
            ...input,
            amountMinor: input.amenity.toLowerCase().includes("cancha") ? 0 : 18000000,
            status: "confirmed"
          };
          snapshot.reservations.unshift(item);
          return {
            action: "reservas.reserva_confirmada",
            detail: `${item.amenity}, ${item.date} ${item.time}`,
            resource: item.id,
            result: item
          };
        }),
        { status: 201 }
      );
    }

    if (path === "visitors") {
      const input = createVisitorSchema.parse(body);
      return NextResponse.json(
        await mutateDemoSnapshot<VisitorItem>((snapshot) => {
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
            detail: `${item.name} autorizado para ${item.unit}`,
            resource: item.id,
            result: item
          };
        }),
        { status: 201 }
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

    const expenseMatch = path.match(/^expenses\/([0-9a-f-]+)\/approve$/i);
    if (expenseMatch) {
      return NextResponse.json(
        await mutateDemoSnapshot<ExpenseItem>((snapshot) => {
          const item = snapshot.expenses.find((expense) => expense.id === expenseMatch[1]);
          if (!item) throw new DemoApiError("La solicitud de gasto no existe.", 404);
          if (item.status !== "pending_approval") {
            throw new DemoApiError("La solicitud ya no está pendiente de aprobación.", 409);
          }
          item.approvals = Math.min(item.approvals + 1, item.approvalsRequired);
          if (item.approvals >= item.approvalsRequired) item.status = "approved";
          return {
            action: "presupuesto.gasto_aprobado",
            detail: `${item.concept}: ${item.approvals} de ${item.approvalsRequired} aprobaciones`,
            resource: item.id,
            result: item
          };
        })
      );
    }

    const feeMatch = path.match(/^fees\/([0-9a-f-]+)\/pay-demo$/i);
    if (feeMatch) {
      return NextResponse.json(
        await mutateDemoSnapshot<Payment>((snapshot, access) => {
          const fee = snapshot.fees.find((candidate) => candidate.id === feeMatch[1]);
          if (!fee) throw new DemoApiError("La obligación no existe.", 404);
          if (fee.balanceMinor <= 0) throw new DemoApiError("La obligación ya fue pagada.", 409);
          const amountMinor = fee.balanceMinor;
          fee.balanceMinor = 0;
          fee.status = "paid";
          const now = new Date().toISOString();
          const paymentId = crypto.randomUUID();
          const payment: Payment = {
            id: paymentId,
            tenantId: access.conjuntoId,
            merchantId: access.conjuntoId,
            reference: fee.id,
            amountMinor,
            currency: "COP",
            description: fee.concept,
            status: "approved",
            provider: "mock",
            providerPaymentId: `demo-${paymentId}`,
            checkoutUrl: "",
            createdAt: now,
            updatedAt: now
          };
          return {
            action: "finanzas.pago_sandbox_aplicado",
            detail: `${fee.unit}: pago de demostración aplicado`,
            resource: fee.id,
            result: payment
          };
        })
      );
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
