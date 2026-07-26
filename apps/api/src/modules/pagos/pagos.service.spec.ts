import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import type { CrearCobroInput } from "@evetev/shared";
import { PagosService, type CobroContext } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { InMemoryPagosRepository } from "./in-memory-pagos.repository";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const ctxA: CobroContext = { tenantId: TENANT_A, actor: "admin" };

function input(overrides: Partial<CrearCobroInput> = {}): CrearCobroInput {
  return {
    merchantId: MERCHANT,
    montoMinor: 150000,
    moneda: "COP",
    referencia: "cuota-marzo",
    descripcion: "Administración marzo",
    ...overrides
  };
}

describe("PagosService — crear cobro idempotente", () => {
  let repo: InMemoryPagosRepository;
  let provider: FakePaymentProvider;
  let service: PagosService;

  beforeEach(() => {
    repo = new InMemoryPagosRepository();
    provider = new FakePaymentProvider();
    service = new PagosService(provider, repo);
  });

  it("EARS 1: crea cobro pendiente y llama al proveedor una sola vez", async () => {
    const spy = vi.spyOn(provider, "crearCobro");
    const cobro = await service.crearCobro(ctxA, input(), "key-1");

    expect(cobro.estado).toBe("pendiente");
    expect(cobro.checkoutUrl).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await repo.contarPorTenant(TENANT_A)).toBe(1);
  });

  it("EARS 2: misma clave + mismo cuerpo devuelve el existente sin re-llamar a Akua", async () => {
    const spy = vi.spyOn(provider, "crearCobro");
    const primero = await service.crearCobro(ctxA, input(), "key-1");
    const segundo = await service.crearCobro(ctxA, input(), "key-1");

    expect(segundo.id).toBe(primero.id);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await repo.contarPorTenant(TENANT_A)).toBe(1);
  });

  it("EARS 3: misma clave + cuerpo distinto → 409 y no crea otro cobro", async () => {
    await service.crearCobro(ctxA, input(), "key-1");
    await expect(
      service.crearCobro(ctxA, input({ montoMinor: 999999 }), "key-1")
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await repo.contarPorTenant(TENANT_A)).toBe(1);
  });

  it("EARS 6: registra auditoría inmutable de la transición inicial", async () => {
    const cobro = await service.crearCobro(ctxA, input(), "key-1");
    expect(repo.auditoria).toHaveLength(1);
    expect(repo.auditoria[0]).toMatchObject({
      paymentId: cobro.id,
      fromStatus: null,
      toStatus: "pendiente",
      actor: "admin"
    });
  });

  it("EARS 7: solicitudes concurrentes con la misma clave crean a lo sumo un cobro", async () => {
    const [a, b] = await Promise.all([
      service.crearCobro(ctxA, input(), "key-1"),
      service.crearCobro(ctxA, input(), "key-1")
    ]);
    expect(a.id).toBe(b.id);
    expect(await repo.contarPorTenant(TENANT_A)).toBe(1);
  });

  it("aislamiento: un tenant no ve los cobros de otro y las claves no colisionan", async () => {
    const cobroA = await service.crearCobro(ctxA, input(), "key-1");

    expect(await repo.buscarCobro(TENANT_B, cobroA.id)).toBeNull();
    expect(await repo.contarPorTenant(TENANT_B)).toBe(0);

    const ctxB: CobroContext = { tenantId: TENANT_B, actor: "admin" };
    const cobroB = await service.crearCobro(ctxB, input(), "key-1");
    expect(cobroB.id).not.toBe(cobroA.id);
    expect(await repo.contarPorTenant(TENANT_B)).toBe(1);
  });
});
