import { describe, expect, it, vi } from "vitest";
import type { PaymentProvider, ReporteConciliacion } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import type { ReconciliacionService } from "../conciliacion/reconciliacion.service";
import type { AdminAuditService } from "./admin-audit.service";
import { ConciliacionAdminService } from "./conciliacion-admin.service";

const TENANT = "11111111-1111-4111-8111-111111111111";
const RANGO = { desde: "2026-09-01T00:00:00.000Z", hasta: "2026-09-30T00:00:00.000Z" };
const CORRIDA_ID = "99999999-9999-4999-8999-999999999999";

function proveedor(liquidaciones: boolean, nombre = "combopay"): PaymentProvider {
  return {
    nombre,
    capacidades: { altaDeComercios: false, liquidaciones, monedas: ["COP"] }
  } as unknown as PaymentProvider;
}

interface Sink {
  guardado?: Record<string, unknown>;
  modo?: string;
  nota?: string | null;
  conciliados?: number | null;
}

/** Devuelve el registro guardado y luego la lectura del histórico. */
function dbQueGuarda(sink: Sink) {
  let llamada = 0;
  return {
    execute: vi.fn(async (q: unknown) => {
      llamada += 1;
      // 1.ª: el INSERT vía función. 2.ª: la relectura del histórico.
      if (llamada === 1) {
        sink.guardado = { consulta: String(JSON.stringify(q)).slice(0, 40) };
        return [{ admin_registrar_conciliacion: CORRIDA_ID }];
      }
      return [
        {
          id: CORRIDA_ID,
          tenant_id: TENANT,
          tenant_nombre: "Los Robles",
          desde: RANGO.desde,
          hasta: RANGO.hasta,
          modo: sink.modo ?? "automatica",
          provider: "combopay",
          conciliados: sink.conciliados ?? null,
          diferencias: null,
          huerfanos_proveedor: null,
          no_conciliados: null,
          nota: sink.nota ?? null,
          actor: "ops@evetev.com",
          corrido_en: "2026-09-02T12:00:00.000Z"
        }
      ];
    })
  } as unknown as Db;
}

function auditoriaFalsa(registros: { accion: string; detalle?: Record<string, unknown> }[]) {
  return {
    registrar: async (a: { accion: string; detalle?: Record<string, unknown> }) => {
      registros.push(a);
      return "audit-1";
    }
  } as unknown as AdminAuditService;
}

describe("ConciliacionAdminService — corrida (CA-19, CA-20)", () => {
  /* CA-20: con un proveedor que no da liquidaciones NO se intenta conciliar y
     NO se guardan ceros. Un reporte de ceros se lee como "todo cuadra", que es
     justo lo contrario de la verdad: nadie comprobó nada. */
  it("con proveedor sin liquidaciones registra la corrida como no soportada", async () => {
    const sink: Sink = { modo: "no_soportada", nota: "combopay no expone liquidaciones…" };
    const registros: { accion: string; detalle?: Record<string, unknown> }[] = [];
    const conciliar = vi.fn();

    const service = new ConciliacionAdminService(
      dbQueGuarda(sink),
      proveedor(false),
      { conciliar } as unknown as ReconciliacionService,
      auditoriaFalsa(registros)
    );

    const corrida = await service.correr(TENANT, RANGO, "ops@evetev.com");

    expect(corrida.modo).toBe("no_soportada");
    expect(corrida.nota).toContain("no expone liquidaciones");
    expect(corrida.conciliados).toBeNull();
    // Lo esencial: ni siquiera se llamó a conciliar.
    expect(conciliar).not.toHaveBeenCalled();
  });

  it("con proveedor que sí liquida, concilia y guarda las cifras", async () => {
    const sink: Sink = { modo: "automatica", conciliados: 3 };
    const registros: { accion: string; detalle?: Record<string, unknown> }[] = [];
    const reporte: ReporteConciliacion = {
      rango: RANGO,
      conciliados: 3,
      diferencias: 1,
      huerfanosProveedor: 0,
      noConciliados: 2
    };
    const conciliar = vi.fn(async () => reporte);

    const service = new ConciliacionAdminService(
      dbQueGuarda(sink),
      proveedor(true, "akua"),
      { conciliar } as unknown as ReconciliacionService,
      auditoriaFalsa(registros)
    );

    const corrida = await service.correr(TENANT, RANGO, "ops@evetev.com");

    expect(conciliar).toHaveBeenCalledOnce();
    expect(corrida.modo).toBe("automatica");
    expect(corrida.conciliados).toBe(3);
  });

  it("audita la corrida en ambos casos", async () => {
    for (const liquida of [true, false]) {
      const registros: { accion: string; detalle?: Record<string, unknown> }[] = [];
      const service = new ConciliacionAdminService(
        dbQueGuarda({ modo: liquida ? "automatica" : "no_soportada" }),
        proveedor(liquida),
        {
          conciliar: async () => ({
            rango: RANGO,
            conciliados: 0,
            diferencias: 0,
            huerfanosProveedor: 0,
            noConciliados: 0
          })
        } as unknown as ReconciliacionService,
        auditoriaFalsa(registros)
      );

      await service.correr(TENANT, RANGO, "ops@evetev.com");

      expect(registros).toHaveLength(1);
      expect(registros[0]!.accion).toBe("conciliacion.correr");
      expect(registros[0]!.detalle).toMatchObject({
        modo: liquida ? "automatica" : "no_soportada"
      });
    }
  });
});

describe("ConciliacionAdminService — ledger (CA-21)", () => {
  function servicioConLedger(
    saldos: Record<string, unknown>[],
    asientos: Record<string, unknown>[]
  ) {
    let n = 0;
    const db = {
      execute: vi.fn(async () => {
        n += 1;
        return n === 1 ? saldos : asientos;
      })
    } as unknown as Db;
    return new ConciliacionAdminService(
      db,
      proveedor(true),
      {} as ReconciliacionService,
      {} as AdminAuditService
    );
  }

  const asientoCuadrado = {
    id: "a-1",
    payment_id: "p-1",
    kind: "cobro_aprobado",
    memo: "",
    posted_at: "2026-09-01T10:00:00.000Z",
    lineas: [
      { cuenta: "caja", direccion: "debit", montoMinor: 150000 },
      { cuenta: "ingresos", direccion: "credit", montoMinor: 150000 }
    ],
    cuadra: true
  };

  it("reconstruye el saldo desde las líneas y confirma que la partida doble cuadra", async () => {
    const service = servicioConLedger(
      [
        { cuenta: "caja", debitos: 150000, creditos: 0, saldo_minor: 150000, movimientos: 1 },
        { cuenta: "ingresos", debitos: 0, creditos: 150000, saldo_minor: -150000, movimientos: 1 }
      ],
      [asientoCuadrado]
    );

    const l = await service.ledger(TENANT);

    expect(l.totalDebitos).toBe(150000);
    expect(l.totalCreditos).toBe(150000);
    expect(l.cuadra).toBe(true);
    expect(l.asientosDescuadrados).toEqual([]);
    expect(l.saldos.find((s) => s.cuenta === "caja")?.saldoMinor).toBe(150000);
  });

  /* Un descuadre no se suaviza ni se redondea: se nombra. Si débitos y
     créditos no coinciden, hay un asiento mal construido y alguien tiene que
     mirarlo antes de que el número acabe en un estado de cuenta. */
  it("señala el descuadre global cuando débitos y créditos no coinciden", async () => {
    const service = servicioConLedger(
      [
        { cuenta: "caja", debitos: 150000, creditos: 0, saldo_minor: 150000, movimientos: 1 },
        { cuenta: "ingresos", debitos: 0, creditos: 100000, saldo_minor: -100000, movimientos: 1 }
      ],
      [asientoCuadrado]
    );

    const l = await service.ledger(TENANT);

    expect(l.cuadra).toBe(false);
    expect(l.totalDebitos).not.toBe(l.totalCreditos);
  });

  it("identifica los asientos concretos que no cuadran", async () => {
    const service = servicioConLedger(
      [{ cuenta: "caja", debitos: 100, creditos: 100, saldo_minor: 0, movimientos: 2 }],
      [asientoCuadrado, { ...asientoCuadrado, id: "a-2", cuadra: false }]
    );

    const l = await service.ledger(TENANT);

    expect(l.asientosDescuadrados).toEqual(["a-2"]);
  });

  it("un ledger vacío cuadra y no inventa incidentes", async () => {
    const l = await servicioConLedger([], []).ledger(TENANT);

    expect(l.cuadra).toBe(true);
    expect(l.saldos).toEqual([]);
    expect(l.asientosDescuadrados).toEqual([]);
  });
});
