import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPagosRepository } from "../pagos/in-memory-pagos.repository";
import { InMemoryLedgerRepository } from "./in-memory-ledger.repository";
import { InMemoryTarifasRepository } from "../tarifas/in-memory-tarifas.repository";
import { FakePaymentProvider } from "../pagos/fake-payment.provider";
import { LedgerService, ModeloSinCustodiaError } from "./ledger.service";
import { LedgerDesbalanceadoError } from "./ledger.repository";
import { CUENTAS } from "./cuentas";

const TENANT = "11111111-1111-4111-8111-111111111111";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const MONTO = 150000;

/* El ejemplo de la spec, en centavos: cobro de $50.000, EvePay cobra $1.200
   con IVA del 19 % ($228) y ComboPay (aquí, fake) nos cobra $800. */
const COBRO = 5_000_000;
const PAYABLE = CUENTAS.merchantPayable(MERCHANT);
const CLEARING = CUENTAS.clearing("fake");

async function seedCobro(
  pagos: InMemoryPagosRepository,
  extra: { amountMinor?: number; tarifaId?: string; tarifaProveedorId?: string } = {}
): Promise<string> {
  const res = await pagos.crearConIdempotencia({
    nuevo: {
      tenantId: TENANT,
      merchantId: MERCHANT,
      amountMinor: extra.amountMinor ?? MONTO,
      currency: "COP",
      reference: "cuota-marzo",
      estado: "pendiente",
      provider: "fake",
      providerPaymentId: "prov-1",
      tarifaId: extra.tarifaId,
      tarifaProveedorId: extra.tarifaProveedorId
    },
    idempotencyKey: `k-${Math.random()}`,
    requestHash: "h1",
    actor: "admin"
  });
  if (!res.creado) throw new Error("seed falló");
  return res.cobro.id;
}

/** Siembra las tarifas del ejemplo y devuelve sus ids, para fijarlos en el cobro. */
async function seedTarifas(
  tarifas: InMemoryTarifasRepository,
  opciones: { ivaBps?: 0 | 1900; descuenta?: boolean; comision?: number; costo?: number } = {}
): Promise<{ tarifaId: string; tarifaProveedorId: string }> {
  tarifas.tenants.add(TENANT);
  const tarifaId = (await tarifas.asignarTarifa({
    tenantId: TENANT,
    tarifa: { bps: 0, fijoMinor: opciones.comision ?? 120_000, ivaBps: opciones.ivaBps ?? 1900 },
    actor: "ops"
  }))!;
  const tarifaProveedorId = await tarifas.asignarTarifaProveedor({
    provider: "fake",
    tarifa: {
      bps: 0,
      fijoMinor: opciones.costo ?? 80_000,
      descuentaEnConsignacion: opciones.descuenta ?? true
    },
    actor: "ops"
  });
  return { tarifaId, tarifaProveedorId };
}

function lineas(repo: InMemoryLedgerRepository, cuenta: string) {
  return repo.lines
    .filter((l) => l.account === cuenta)
    .map((l) => `${l.direction}:${l.amountMinor}`)
    .sort();
}

describe("LedgerService — doble partida inmutable", () => {
  let pagos: InMemoryPagosRepository;
  let ledgerRepo: InMemoryLedgerRepository;
  let tarifas: InMemoryTarifasRepository;
  let service: LedgerService;

  beforeEach(() => {
    pagos = new InMemoryPagosRepository();
    ledgerRepo = new InMemoryLedgerRepository();
    tarifas = new InMemoryTarifasRepository();
    service = new LedgerService(ledgerRepo, pagos, new FakePaymentProvider(), tarifas);
  });

  it("un cobro anterior a la Fase 6 (sin tarifas) va entero al comercio, como se asentaba", async () => {
    const id = await seedCobro(pagos);
    const res = await service.registrarCobroAprobado(TENANT, id);

    expect(res.posted).toBe(true);
    expect(await service.saldo(TENANT, PAYABLE)).toBe(MONTO); // crédito
    // La compensación va nombrada por proveedor: con dos adquirencias hay que
    // poder decir cuánto tiene cada una sin mezclarlo en una cuenta común.
    expect(await service.saldo(TENANT, CLEARING)).toBe(-MONTO); // débito
    expect(await service.saldo(TENANT, "akua_clearing")).toBe(0);
    expect(ledgerRepo.lines).toHaveLength(2);
  });

  it("EARS 2: un asiento desbalanceado se rechaza sin persistir", async () => {
    await expect(
      service.postAsiento({
        tenantId: TENANT,
        kind: "prueba",
        memo: "desbalanceado",
        lines: [
          { account: "a", direction: "debit", amountMinor: 100 },
          { account: "b", direction: "credit", amountMinor: 90 }
        ]
      })
    ).rejects.toBeInstanceOf(LedgerDesbalanceadoError);
    expect(ledgerRepo.entries).toHaveLength(0);
    expect(ledgerRepo.lines).toHaveLength(0);
  });

  it("EARS 4: asentar dos veces el mismo cobro no duplica (idempotente)", async () => {
    const id = await seedCobro(pagos);
    const primero = await service.registrarCobroAprobado(TENANT, id);
    const segundo = await service.registrarCobroAprobado(TENANT, id);

    expect(primero.posted).toBe(true);
    expect(segundo.posted).toBe(false);
    expect(await ledgerRepo.contarAsientosPorPago(TENANT, id)).toBe(1);
    expect(await service.saldo(TENANT, PAYABLE)).toBe(MONTO);
  });
});

/* El modelo de fondos: ComboPay consigna todo a EvePay y EvePay dispersa. El
   libro tiene que decir, desde que el cobro se aprueba, cuánto es del
   comercio, cuánto de EvePay, cuánto de la DIAN y cuánto del proveedor. */
describe("LedgerService — cobro aprobado con custodia (ledger-custodia CA-1 a CA-3)", () => {
  let pagos: InMemoryPagosRepository;
  let ledgerRepo: InMemoryLedgerRepository;
  let tarifas: InMemoryTarifasRepository;
  let service: LedgerService;

  beforeEach(() => {
    pagos = new InMemoryPagosRepository();
    ledgerRepo = new InMemoryLedgerRepository();
    tarifas = new InMemoryTarifasRepository();
    service = new LedgerService(ledgerRepo, pagos, new FakePaymentProvider(), tarifas);
  });

  it("CA-1: el ejemplo de la spec, con el costo descontado en la consignación", async () => {
    const ids = await seedTarifas(tarifas);
    const id = await seedCobro(pagos, { amountMinor: COBRO, ...ids });

    expect((await service.registrarCobroAprobado(TENANT, id)).posted).toBe(true);

    expect(lineas(ledgerRepo, CLEARING)).toEqual(["credit:80000", "debit:5000000"]);
    expect(lineas(ledgerRepo, PAYABLE)).toEqual(["credit:4857200"]);
    expect(lineas(ledgerRepo, CUENTAS.comisionEvepay)).toEqual(["credit:120000"]);
    expect(lineas(ledgerRepo, CUENTAS.ivaPorPagar)).toEqual(["credit:22800"]);
    expect(lineas(ledgerRepo, CUENTAS.costoProveedor("fake"))).toEqual(["debit:80000"]);
    expect(lineas(ledgerRepo, CUENTAS.porPagar("fake"))).toEqual([]);

    // Lo que ComboPay nos debe es exactamente lo que va a consignar: $49.200.
    expect(await service.saldo(TENANT, CLEARING)).toBe(-4_920_000);
    // Y el margen es $400: la comisión menos el costo. El IVA no es de EvePay.
    expect(
      (await service.saldo(TENANT, CUENTAS.comisionEvepay)) +
        (await service.saldo(TENANT, CUENTAS.costoProveedor("fake")))
    ).toBe(40_000);
    expect(ledgerRepo.lines).toHaveLength(6);
  });

  it("CA-1: si el proveedor factura aparte, su costo va a por_pagar y nos debe el monto entero", async () => {
    const ids = await seedTarifas(tarifas, { descuenta: false });
    const id = await seedCobro(pagos, { amountMinor: COBRO, ...ids });

    await service.registrarCobroAprobado(TENANT, id);

    expect(lineas(ledgerRepo, CLEARING)).toEqual(["debit:5000000"]);
    expect(lineas(ledgerRepo, CUENTAS.porPagar("fake"))).toEqual(["credit:80000"]);
    expect(await service.saldo(TENANT, CLEARING)).toBe(-5_000_000);
  });

  it("CA-2: con IVA en 0 % no hay línea de IVA y el asiento sigue cuadrado", async () => {
    const ids = await seedTarifas(tarifas, { ivaBps: 0 });
    const id = await seedCobro(pagos, { amountMinor: COBRO, ...ids });

    await service.registrarCobroAprobado(TENANT, id);

    expect(lineas(ledgerRepo, CUENTAS.ivaPorPagar)).toEqual([]);
    expect(lineas(ledgerRepo, PAYABLE)).toEqual(["credit:4880000"]);
    expect(ledgerRepo.lines).toHaveLength(5);
  });

  it("CA-2: con comisión y costo en 0 (piloto) quedan solo las dos líneas de siempre", async () => {
    const ids = await seedTarifas(tarifas, { comision: 0, costo: 0, ivaBps: 1900 });
    const id = await seedCobro(pagos, { amountMinor: COBRO, ...ids });

    await service.registrarCobroAprobado(TENANT, id);

    expect(lineas(ledgerRepo, CLEARING)).toEqual(["debit:5000000"]);
    expect(lineas(ledgerRepo, PAYABLE)).toEqual(["credit:5000000"]);
    expect(ledgerRepo.lines).toHaveLength(2);
  });

  it("todo asiento del cobro aprobado cuadra, con cualquier tarifa", async () => {
    for (const [comision, costo, ivaBps] of [
      [120_000, 80_000, 1900],
      [1, 1, 1900],
      [333_333, 1, 0],
      [0, 999_999, 1900]
    ] as const) {
      const repo = new InMemoryLedgerRepository();
      const t = new InMemoryTarifasRepository();
      const p = new InMemoryPagosRepository();
      const s = new LedgerService(repo, p, new FakePaymentProvider(), t);
      const ids = await seedTarifas(t, { comision, costo, ivaBps });
      const id = await seedCobro(p, { amountMinor: COBRO, ...ids });

      await s.registrarCobroAprobado(TENANT, id);

      const debitos = repo.lines
        .filter((l) => l.direction === "debit")
        .reduce((a, l) => a + l.amountMinor, 0);
      const creditos = repo.lines
        .filter((l) => l.direction === "credit")
        .reduce((a, l) => a + l.amountMinor, 0);
      expect(debitos).toBe(creditos);
      expect(debitos).toBe(COBRO + costo);
    }
  });

  it("CA-3: sin custodia el ledger se niega a asentar, con un error explícito", async () => {
    const sinCustodia = new FakePaymentProvider();
    Object.defineProperty(sinCustodia, "capacidades", {
      value: { ...sinCustodia.capacidades, custodia: false }
    });
    const s = new LedgerService(ledgerRepo, pagos, sinCustodia, tarifas);
    const id = await seedCobro(pagos);

    await expect(s.registrarCobroAprobado(TENANT, id)).rejects.toBeInstanceOf(
      ModeloSinCustodiaError
    );
    expect(ledgerRepo.entries).toHaveLength(0);
  });

  it("la conciliación automática mueve a recaudo exactamente lo que el proveedor debía", async () => {
    const ids = await seedTarifas(tarifas);
    const id = await seedCobro(pagos, { amountMinor: COBRO, ...ids });
    await service.registrarCobroAprobado(TENANT, id);

    await service.registrarCobroConciliado(TENANT, id);

    expect(lineas(ledgerRepo, CUENTAS.recaudo)).toEqual(["debit:4920000"]);
    // Cerrada la compensación: el proveedor ya no nos debe nada de este cobro.
    expect(await service.saldo(TENANT, CLEARING)).toBe(0);
    // Y el dinero de terceros está en la cuenta de recaudo, no en `banco`.
    expect(lineas(ledgerRepo, CUENTAS.bancoHistorico)).toEqual([]);
  });
});
