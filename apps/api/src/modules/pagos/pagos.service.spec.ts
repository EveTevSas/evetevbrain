import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { CrearCobroInput, EstadoMerchant, TarifaComercio } from "@evetev/shared";
import { PagosService, type CobroContext } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { InMemoryPagosRepository } from "./in-memory-pagos.repository";
import { InMemoryMerchantsRepository } from "../merchants/in-memory-merchants.repository";
import { InMemoryTarifasRepository } from "../tarifas/in-memory-tarifas.repository";
import { InMemoryRiesgoRepository } from "../riesgo/in-memory-riesgo.repository";
import { RiesgoService } from "../riesgo/riesgo.service";
import type { ReglaRiesgo, SenalesRiesgo } from "@evetev/shared";

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

/** 2,90 % + $300 con IVA del 19 %: una tarifa cualquiera que deja margen. */
const TARIFA_COMERCIO: TarifaComercio = { bps: 290, fijoMinor: 30_000, ivaBps: 1900 };

/**
 * Siembra las dos tarifas que un cobro necesita: la de cada comercio y la del
 * proveedor que atiende. Sin ellas el cobro se rechaza antes de llamar al
 * proveedor, así que montar el escenario incluye ponerlas, igual que en
 * producción las pone operación desde la consola.
 */
function tarifasCon(
  opciones: { comercio?: boolean; proveedor?: boolean; tarifa?: TarifaComercio } = {}
): InMemoryTarifasRepository {
  const { comercio = true, proveedor = true, tarifa = TARIFA_COMERCIO } = opciones;
  const repo = new InMemoryTarifasRepository();
  const ahora = new Date().toISOString();
  for (const tenantId of [TENANT_A, TENANT_B]) {
    repo.tenants.add(tenantId);
    if (comercio) {
      repo.comercio.push({
        ...tarifa,
        id: `tarifa-${tenantId.slice(0, 4)}`,
        tenantId,
        vigenteDesde: ahora,
        creadaPor: "seed",
        creadaEn: ahora
      });
    }
  }
  if (proveedor) {
    for (const provider of ["fake", "combopay"]) {
      repo.proveedor.push({
        id: `tarifa-${provider}`,
        provider,
        bps: 0,
        fijoMinor: 80_000,
        descuentaEnConsignacion: true,
        vigenteDesde: ahora,
        creadaPor: "seed",
        creadaEn: ahora
      });
    }
  }
  return repo;
}

/** Sin reglas: el riesgo no interviene. Los tests de riesgo siembran las suyas. */
function riesgoCon(
  reglas: (ReglaRiesgo & { id: string })[] = [],
  senales?: SenalesRiesgo
): RiesgoService {
  const repo = new InMemoryRiesgoRepository();
  for (const r of reglas) {
    repo.reglas.push({
      ...r,
      tenantNombre: null,
      creadaPor: "seed",
      creadaEn: "",
      actualizadaPor: "seed",
      actualizadaEn: "",
      disparos30d: 0,
      disparosHoy: 0,
      retenciones30d: 0,
      liberadas30d: 0
    });
  }
  if (senales) repo.senalesDe.set(TENANT_A, senales);
  return new RiesgoService(repo);
}

describe("PagosService — crear cobro idempotente", () => {
  let repo: InMemoryPagosRepository;
  let provider: FakePaymentProvider;
  let service: PagosService;

  beforeEach(() => {
    repo = new InMemoryPagosRepository();
    provider = new FakePaymentProvider();
    service = new PagosService(provider, repo, merchantsCon(), tarifasCon(), riesgoCon());
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
    const service = new PagosService(
      provider,
      new InMemoryPagosRepository(),
      merchantsCon(),
      tarifasCon(),
      riesgoCon()
    );
    await expect(service.crearCobro(ctxA, input(), "k-ok")).resolves.toMatchObject({
      estado: "pendiente"
    });
  });

  it.each(["en_revision", "rechazado", "pendiente"] as EstadoMerchant[])(
    "un comercio en estado %s NO puede cobrar",
    async (estado) => {
      const repo = new InMemoryPagosRepository();
      const service = new PagosService(
        provider,
        repo,
        merchantsCon(estado),
        tarifasCon(),
        riesgoCon()
      );
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
      merchantsCon("en_revision"),
      tarifasCon(),
      riesgoCon()
    );
    await expect(service.crearCobro(ctxA, input(), "k-2")).rejects.toThrow(/en_revision/);
    await expect(service.crearCobro(ctxA, input(), "k-3")).rejects.toThrow(/consola de EvePay/);
  });

  /* De paso cierra un hueco de integridad: el merchantId venía en el cuerpo y
     se persistía tal cual, sin comprobar que fuera de quien llamaba. Un cobro
     podía quedar atribuido al comercio de otro. */
  it("usar el comercio de OTRO tenant se rechaza, aunque esté aprobado", async () => {
    const service = new PagosService(
      provider,
      new InMemoryPagosRepository(),
      merchantsCon(),
      tarifasCon(),
      riesgoCon()
    );
    // MERCHANT_B está aprobado, pero es de TENANT_B y quien llama es TENANT_A.
    await expect(
      service.crearCobro(ctxA, input({ merchantId: MERCHANT_B }), "k-4")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("un merchantId inexistente se rechaza", async () => {
    const service = new PagosService(
      provider,
      new InMemoryPagosRepository(),
      merchantsCon(),
      tarifasCon(),
      riesgoCon()
    );
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
    const service = new PagosService(combopay, repo, merchantsCon(), tarifasCon(), riesgoCon());

    await service.crearCobro(ctxA, input(), "k-6");

    expect(espia.mock.calls[0]?.[0].nuevo.provider).toBe("combopay");
  });
});

/* Sin tarifas no hay forma de saber cuánto es del comercio, cuánto de EvePay y
   cuánto del proveedor, así que el cobro no se podría asentar ni cuadrar. Se
   rechaza antes de llamar al proveedor: si se creara allá, habría plata en
   camino que nadie sabe repartir (spec `comisiones`, CA-3 a CA-7). */
describe("PagosService — las tarifas viajan con el cobro", () => {
  const provider = new FakePaymentProvider();

  it("CA-5: el cobro guarda las versiones vigentes de las dos tarifas", async () => {
    const repo = new InMemoryPagosRepository();
    const tarifas = tarifasCon();
    const espia = vi.spyOn(repo, "crearConIdempotencia");
    const service = new PagosService(provider, repo, merchantsCon(), tarifas, riesgoCon());

    await service.crearCobro(ctxA, input(), "k-t1");

    const nuevo = espia.mock.calls[0]?.[0].nuevo;
    expect(nuevo?.tarifaId).toBe((await tarifas.tarifaVigente(TENANT_A))!.id);
    expect(nuevo?.tarifaProveedorId).toBe((await tarifas.tarifaProveedorVigente("fake"))!.id);
  });

  it("CA-5: cambiar una tarifa después no altera el cobro ya creado", async () => {
    const repo = new InMemoryPagosRepository();
    const tarifas = tarifasCon();
    const espia = vi.spyOn(repo, "crearConIdempotencia");
    const service = new PagosService(provider, repo, merchantsCon(), tarifas, riesgoCon());

    await service.crearCobro(ctxA, input(), "k-t2");
    const versionVieja = espia.mock.calls[0]?.[0].nuevo.tarifaId;

    const versionNueva = await tarifas.asignarTarifa({
      tenantId: TENANT_A,
      tarifa: { bps: 100, fijoMinor: 0, ivaBps: 0 },
      actor: "ops@evetev.com"
    });
    await service.crearCobro(ctxA, input(), "k-t3");

    expect(espia.mock.calls[0]?.[0].nuevo.tarifaId).toBe(versionVieja);
    expect(espia.mock.calls[1]?.[0].nuevo.tarifaId).toBe(versionNueva);
    expect(versionNueva).not.toBe(versionVieja);
  });

  it("CA-3: un comercio sin tarifa no cobra (409) y no se llama al proveedor", async () => {
    const repo = new InMemoryPagosRepository();
    const spy = vi.spyOn(provider, "crearCobro");
    spy.mockClear();
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon({ comercio: false }),
      riesgoCon()
    );

    await expect(service.crearCobro(ctxA, input(), "k-t4")).rejects.toBeInstanceOf(
      ConflictException
    );
    await expect(service.crearCobro(ctxA, input(), "k-t4")).rejects.toThrow(/tarifa/);
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.contarPorTenant(TENANT_A)).toBe(0);
  });

  it("CA-4: sin tarifa del proveedor activo no se cobra (409) ni se le llama", async () => {
    const repo = new InMemoryPagosRepository();
    const spy = vi.spyOn(provider, "crearCobro");
    spy.mockClear();
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon({ proveedor: false }),
      riesgoCon()
    );

    await expect(service.crearCobro(ctxA, input(), "k-t5")).rejects.toBeInstanceOf(
      ConflictException
    );
    await expect(service.crearCobro(ctxA, input(), "k-t5")).rejects.toThrow(/proveedor "fake"/);
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.contarPorTenant(TENANT_A)).toBe(0);
  });

  /* Una tarifa fija igual al monto deja al comercio en cero; con IVA, en
     negativo. Las dos son una tarifa mal puesta, no un cobro válido. */
  it.each([
    { caso: "igual al monto", tarifa: { bps: 0, fijoMinor: 150_000, ivaBps: 0 as const } },
    {
      caso: "más su IVA supera el monto",
      tarifa: { bps: 0, fijoMinor: 150_000, ivaBps: 1900 as const }
    },
    { caso: "del 100 %", tarifa: { bps: 10_000, fijoMinor: 0, ivaBps: 0 as const } }
  ])("CA-7: comisión $caso → 400 sin llamar al proveedor", async ({ tarifa }) => {
    const repo = new InMemoryPagosRepository();
    const spy = vi.spyOn(provider, "crearCobro");
    spy.mockClear();
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon({ tarifa }),
      riesgoCon()
    );

    await expect(
      service.crearCobro(ctxA, input({ montoMinor: 150_000 }), "k-t6")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.contarPorTenant(TENANT_A)).toBe(0);
  });

  it("una comisión que deja un centavo al comercio sí pasa", async () => {
    const service = new PagosService(
      provider,
      new InMemoryPagosRepository(),
      merchantsCon(),
      tarifasCon({ tarifa: { bps: 0, fijoMinor: 149_999, ivaBps: 0 } }),
      riesgoCon()
    );
    await expect(
      service.crearCobro(ctxA, input({ montoMinor: 150_000 }), "k-t7")
    ).resolves.toMatchObject({ estado: "pendiente" });
  });
});

/* El riesgo del comercio corre antes del proveedor (spec riesgo-comercio):
   rechazar = el cobro no existe; retener = se crea pero queda retenido para
   la dispersión; shadow = solo se anota. */
describe("PagosService — riesgo del comercio (riesgo-comercio CA-1 a CA-3)", () => {
  const provider = new FakePaymentProvider();
  const LIMITE: ReglaRiesgo & { id: string } = {
    id: "lim",
    nombre: "Límite por transacción",
    tipo: "limite_transaccion",
    tenantId: null,
    parametros: { limiteMinor: 100_000 },
    accion: "rechazar",
    modo: "activa",
    prioridad: 10
  };

  it("CA-1: una regla activa de rechazar → 409 sin llamar al proveedor, y la evaluación queda", async () => {
    const repo = new InMemoryPagosRepository();
    const riesgoRepo = new InMemoryRiesgoRepository();
    riesgoRepo.reglas.push({
      ...LIMITE,
      tenantNombre: null,
      creadaPor: "s",
      creadaEn: "",
      actualizadaPor: "s",
      actualizadaEn: "",
      disparos30d: 0,
      disparosHoy: 0,
      retenciones30d: 0,
      liberadas30d: 0
    });
    const spy = vi.spyOn(provider, "crearCobro");
    spy.mockClear();
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon(),
      new RiesgoService(riesgoRepo)
    );

    const error = await service.crearCobro(ctxA, input(), "k-r1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as Error).message).toMatch(/rechazado por riesgo: Límite por transacción/);
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.contarPorTenant(TENANT_A)).toBe(0);
    expect(riesgoRepo.evaluaciones).toEqual([
      expect.objectContaining({ decision: "rechazar", paymentId: null })
    ]);
  });

  it("CA-2: la misma regla en shadow deja crear el cobro y anota qué habría hecho", async () => {
    const repo = new InMemoryPagosRepository();
    const riesgoRepo = new InMemoryRiesgoRepository();
    riesgoRepo.reglas.push({
      ...LIMITE,
      modo: "shadow",
      tenantNombre: null,
      creadaPor: "s",
      creadaEn: "",
      actualizadaPor: "s",
      actualizadaEn: "",
      disparos30d: 0,
      disparosHoy: 0,
      retenciones30d: 0,
      liberadas30d: 0
    });
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon(),
      new RiesgoService(riesgoRepo)
    );

    const cobro = await service.crearCobro(ctxA, input(), "k-r2");
    expect(cobro.estado).toBe("pendiente");
    expect(riesgoRepo.evaluaciones[0]).toMatchObject({
      decision: "permitir",
      paymentId: cobro.id,
      reglasDisparadas: [expect.objectContaining({ id: "lim", actuo: false, modo: "shadow" })]
    });
    expect(riesgoRepo.retenciones).toHaveLength(0);
  });

  it("CA-3: monto atípico activo → el cobro se crea y queda retenido por riesgo", async () => {
    const repo = new InMemoryPagosRepository();
    const riesgoRepo = new InMemoryRiesgoRepository();
    riesgoRepo.reglas.push({
      id: "atip",
      nombre: "Monto atípico",
      tipo: "monto_atipico",
      tenantId: null,
      parametros: { factor: 5, minimoCobros: 10 },
      accion: "retener",
      modo: "activa",
      prioridad: 40,
      tenantNombre: null,
      creadaPor: "s",
      creadaEn: "",
      actualizadaPor: "s",
      actualizadaEn: "",
      disparos30d: 0,
      disparosHoy: 0,
      retenciones30d: 0,
      liberadas30d: 0
    });
    riesgoRepo.senalesDe.set(TENANT_A, {
      hoyMinor: 0,
      mesMinor: 0,
      ticketPromedioMinor: 10_000,
      cobrosHistoricos: 20
    });
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon(),
      new RiesgoService(riesgoRepo)
    );

    const cobro = await service.crearCobro(ctxA, input({ montoMinor: 150_000 }), "k-r3");
    expect(cobro.estado).toBe("pendiente");
    expect(riesgoRepo.retenciones).toEqual([
      expect.objectContaining({
        paymentId: cobro.id,
        motivo: expect.stringMatching(/Monto atípico/)
      })
    ]);
    expect(riesgoRepo.evaluaciones[0]?.decision).toBe("retener");
  });

  it("un reintento idempotente no se vuelve a evaluar", async () => {
    const repo = new InMemoryPagosRepository();
    const riesgoRepo = new InMemoryRiesgoRepository();
    const service = new PagosService(
      provider,
      repo,
      merchantsCon(),
      tarifasCon(),
      new RiesgoService(riesgoRepo)
    );
    await service.crearCobro(ctxA, input(), "k-r4");
    await service.crearCobro(ctxA, input(), "k-r4");
    expect(riesgoRepo.evaluaciones).toHaveLength(1);
  });
});
