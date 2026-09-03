import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import type { CrearCobroInput, EstadoMerchant } from "@evetev/shared";
import { PagosService, type CobroContext } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { InMemoryPagosRepository } from "./in-memory-pagos.repository";
import { InMemoryMerchantsRepository } from "../merchants/in-memory-merchants.repository";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const MERCHANT_B = "55555555-5555-4555-8555-555555555555";
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

/**
 * Siembra el comercio aprobado que los cobros necesitan. Desde que cobrar
 * exige un comercio aprobado, montar el escenario incluye darlo de alta: es
 * exactamente lo que pasa en producción.
 */
function merchantsCon(
  estado: EstadoMerchant = "aprobado",
  tenantId = TENANT_A
): InMemoryMerchantsRepository {
  const repo = new InMemoryMerchantsRepository();
  // Se insertan con ids fijos en vez de dejar que el repo los genere: el cobro
  // se valida contra (tenant, merchantId) exactos. Cada tenant tiene el suyo,
  // que es justo lo que impide usar el comercio de otro.
  const fila = (id: string, tid: string, e: EstadoMerchant) => ({
    id,
    tenantId: tid,
    legalName: "Comercio Demo",
    provider: "fake",
    providerMerchantId: `pm-${id.slice(0, 4)}`,
    estado: e,
    creadoEn: new Date().toISOString()
  });
  repo.merchants.set(MERCHANT, fila(MERCHANT, tenantId, estado));
  repo.merchants.set(MERCHANT_B, fila(MERCHANT_B, TENANT_B, "aprobado"));
  return repo;
}

describe("PagosService — crear cobro idempotente", () => {
  let repo: InMemoryPagosRepository;
  let provider: FakePaymentProvider;
  let service: PagosService;

  beforeEach(() => {
    repo = new InMemoryPagosRepository();
    provider = new FakePaymentProvider();
    service = new PagosService(provider, repo, merchantsCon());
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
    const cobroB = await service.crearCobro(ctxB, input({ merchantId: MERCHANT_B }), "key-1");
    expect(cobroB.id).not.toBe(cobroA.id);
    expect(await repo.contarPorTenant(TENANT_B)).toBe(1);
  });
});

/* La regla que impide cobrar sin estar registrado donde se liquida.
   Con Akua el KYC lo hacía la adquirencia y un comercio sin aprobar fallaba
   allá. Con ComboPay, que opera como agregador, el alta en su panel es manual
   y nadie de fuera lo impediría: el cobro saldría y el dinero llegaría a una
   cuenta sin dueño identificable. */
describe("PagosService — solo cobra un comercio aprobado", () => {
  const provider = new FakePaymentProvider();

  it("un comercio aprobado cobra normalmente", async () => {
    const service = new PagosService(provider, new InMemoryPagosRepository(), merchantsCon());
    await expect(service.crearCobro(ctxA, input(), "k-ok")).resolves.toMatchObject({
      estado: "pendiente"
    });
  });

  it.each(["en_revision", "rechazado", "pendiente"] as EstadoMerchant[])(
    "un comercio en estado %s NO puede cobrar",
    async (estado) => {
      const repo = new InMemoryPagosRepository();
      const service = new PagosService(provider, repo, merchantsCon(estado));
      const spy = vi.spyOn(provider, "crearCobro");
      spy.mockClear();

      await expect(service.crearCobro(ctxA, input(), "k-1")).rejects.toBeInstanceOf(
        ConflictException
      );
      // Ni se llamó al proveedor ni quedó rastro de cobro.
      expect(spy).not.toHaveBeenCalled();
      expect(await repo.contarPorTenant(TENANT_A)).toBe(0);
    }
  );

  it("el mensaje dice el estado y qué hacer, no solo que no se puede", async () => {
    const service = new PagosService(
      provider,
      new InMemoryPagosRepository(),
      merchantsCon("en_revision")
    );
    await expect(service.crearCobro(ctxA, input(), "k-2")).rejects.toThrow(/en_revision/);
    await expect(service.crearCobro(ctxA, input(), "k-3")).rejects.toThrow(/consola de EvePay/);
  });

  /* De paso cierra un hueco de integridad: el merchantId venía en el cuerpo y
     se persistía tal cual, sin comprobar que fuera de quien llamaba. Un cobro
     podía quedar atribuido al comercio de otro. */
  it("usar el comercio de OTRO tenant se rechaza, aunque esté aprobado", async () => {
    const service = new PagosService(provider, new InMemoryPagosRepository(), merchantsCon());
    // MERCHANT_B está aprobado, pero es de TENANT_B y quien llama es TENANT_A.
    await expect(
      service.crearCobro(ctxA, input({ merchantId: MERCHANT_B }), "k-4")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("un merchantId inexistente se rechaza", async () => {
    const service = new PagosService(provider, new InMemoryPagosRepository(), merchantsCon());
    await expect(
      service.crearCobro(ctxA, input({ merchantId: "44444444-4444-4444-8444-444444444444" }), "k-5")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  /* El proveedor que procesa el cobro se guarda por su nombre real. Antes se
     derivaba de PAYMENT_PROVIDER con un ternario que solo conocía "akua", así
     que con ComboPay activo cada cobro quedaba marcado como "fake" — y ese es
     el campo con el que después se concilia. */
  it("guarda el nombre real del proveedor, no el de la variable de entorno", async () => {
    const repo = new InMemoryPagosRepository();
    const combopay = new FakePaymentProvider();
    Object.defineProperty(combopay, "nombre", { value: "combopay" });
    const espia = vi.spyOn(repo, "crearConIdempotencia");
    const service = new PagosService(combopay, repo, merchantsCon());

    await service.crearCobro(ctxA, input(), "k-6");

    expect(espia.mock.calls[0]?.[0].nuevo.provider).toBe("combopay");
  });
});
