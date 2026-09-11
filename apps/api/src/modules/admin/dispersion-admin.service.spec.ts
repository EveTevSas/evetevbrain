import { describe, expect, it } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Db } from "../../database/drizzle";
import { DispersionAdminService } from "./dispersion-admin.service";

/** Una base guionada: responde en orden lo que se le pase por cada consulta. */
function dbGuionada(respuestas: Array<unknown[] | { code: string; message: string }>): Db {
  const cola = [...respuestas];
  return {
    execute: async () => {
      const r = cola.shift();
      if (r === undefined) throw new Error("la prueba no previó esta consulta");
      if (Array.isArray(r)) return r;
      const causa = Object.assign(new Error(r.message), { code: r.code });
      throw Object.assign(new Error("Failed query"), { cause: causa });
    }
  } as unknown as Db;
}

const OPS = { actor: "ops@evetev.com", rol: "ops" };
const FIN = { actor: "fin@evetev.com", rol: "finanzas" };
const T = "11111111-1111-4111-8111-111111111111";
const RETENCION = (tipo: string) => [
  {
    id: "r1",
    tenant_id: T,
    tenant_nombre: "X",
    tipo,
    monto_minor: "100",
    motivo: "m",
    creada_por: "a",
    creada_en: "2026-09-11T00:00:00Z",
    estado: "activa"
  }
];

describe("DispersionAdminService — preparar lote", () => {
  it("si la base devuelve null, explica por qué no hay nada disponible (primer cobro retenido)", async () => {
    const service = new DispersionAdminService(
      dbGuionada([
        [{ admin_preparar_lote: null }],
        [{ disponible_minor: "0", primer_cobro_retenido: true }]
      ])
    );
    const error = await service.prepararLote(T, OPS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/primer cobro/);
  });

  it("…o porque el dinero aún está pendiente", async () => {
    const service = new DispersionAdminService(
      dbGuionada([
        [{ admin_preparar_lote: null }],
        [{ disponible_minor: "0", pendiente_minor: "48572" }]
      ])
    );
    await expect(service.prepararLote(T, OPS)).rejects.toThrow(/pendiente/);
  });

  it("CA-3 desde la base: cuenta sin certificar → 400 con el mensaje de la función", async () => {
    const service = new DispersionAdminService(
      dbGuionada([
        {
          code: "23514",
          message:
            "La certificación bancaria del comercio no está verificada: no se dispersa a una cuenta sin certificar"
        }
      ])
    );
    await expect(service.prepararLote(T, OPS)).rejects.toThrow(/certificación bancaria/);
  });
});

describe("DispersionAdminService — cuatro ojos y pago único", () => {
  it("CA-4: la base rechaza que apruebe quien preparó, y el mensaje llega tal cual", async () => {
    const service = new DispersionAdminService(
      dbGuionada([
        {
          code: "23514",
          message:
            "Cuatro ojos: ops@evetev.com preparó este lote y no puede aprobarlo; debe aprobarlo otra persona"
        }
      ])
    );
    const error = await service.aprobarLote("l1", OPS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/Cuatro ojos/);
  });

  it("CA-6: pagar dos veces → 400 «no se paga dos veces»", async () => {
    const service = new DispersionAdminService(
      dbGuionada([{ code: "23514", message: "El lote ya está pagado: no se paga dos veces" }])
    );
    await expect(
      service.registrarPago("l1", { fecha: "2026-09-11", referenciaPago: "TRF-1" }, FIN)
    ).rejects.toThrow(/no se paga dos veces/);
  });
});

describe("DispersionAdminService — liberar retenciones por tipo", () => {
  it("ops libera el primer cobro pero no una reserva", async () => {
    const soloLee = new DispersionAdminService(dbGuionada([RETENCION("reserva")]));
    await expect(soloLee.liberarRetencion("r1", "prueba", OPS)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    const libera = new DispersionAdminService(
      dbGuionada([
        RETENCION("primer_cobro"),
        [],
        [{ ...RETENCION("primer_cobro")[0], estado: "liberada" }]
      ])
    );
    await expect(libera.liberarRetencion("r1", "Revisado", OPS)).resolves.toMatchObject({
      estado: "liberada"
    });
  });

  it("finanzas libera la reserva", async () => {
    const service = new DispersionAdminService(
      dbGuionada([RETENCION("reserva"), [], [{ ...RETENCION("reserva")[0], estado: "liberada" }]])
    );
    await expect(service.liberarRetencion("r1", "Pasaron los 30 días", FIN)).resolves.toMatchObject(
      {
        tipo: "reserva",
        estado: "liberada"
      }
    );
  });
});
