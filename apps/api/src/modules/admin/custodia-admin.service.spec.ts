import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { Db } from "../../database/drizzle";
import type { ProvidersService } from "./providers.service";
import { CustodiaAdminService } from "./custodia-admin.service";

const providers = {
  estado: () => ({ activo: "fake", proveedores: [{ nombre: "combopay" }, { nombre: "fake" }] })
} as unknown as ProvidersService;

/**
 * Una base que responde lo que se le diga, o lanza el error que se le diga
 * COMO LO LANZA DRIZZLE: un DrizzleQueryError genérico con el PostgresError
 * (código y mensaje) en `cause`. Leer el código del envoltorio, y no de la
 * causa, fue justo el fallo que convirtió un "no cuadra" en un 500.
 */
function dbQue(respuesta: unknown[] | { code: string; message: string }): Db {
  return {
    execute: async () => {
      if (Array.isArray(respuesta)) return respuesta;
      const causa = Object.assign(new Error(respuesta.message), { code: respuesta.code });
      throw Object.assign(new Error(`Failed query: select …`), { cause: causa });
    }
  } as unknown as Db;
}

const ENTRADA = {
  provider: "fake",
  referenciaBancaria: "REF-1",
  fecha: "2026-09-11",
  montoMinor: 68_400,
  paymentIds: ["bbbbbbbb-0000-4000-8000-000000000001"]
};

/* Las reglas de la consignación viven en la base (0016) y se prueban contra
   ella. Aquí se prueba lo único que hace este servicio: que los errores de la
   función lleguen a operación con su mensaje y el código HTTP que corresponde. */
describe("CustodiaAdminService — errores de la base con nombre y apellido", () => {
  it("una consignación que no cuadra → 400 con el mensaje de la base", async () => {
    const service = new CustodiaAdminService(
      dbQue({
        code: "23514",
        message:
          "La consignación no cuadra: por estos cobros el proveedor debía 68400 y consignó 70000 (diferencia 1600)"
      }),
      providers
    );
    const error = await service.registrarConsignacion(ENTRADA, "ops").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/debía 68400 y consignó 70000/);
  });

  it("una referencia bancaria repetida → 409", async () => {
    const service = new CustodiaAdminService(
      dbQue({
        code: "23505",
        message: 'La referencia bancaria "REF-1" de fake ya está registrada'
      }),
      providers
    );
    await expect(service.registrarConsignacion(ENTRADA, "ops")).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("un cobro que no existe → 404", async () => {
    const service = new CustodiaAdminService(
      dbQue({ code: "P0002", message: "Alguno de los cobros no existe" }),
      providers
    );
    await expect(service.registrarConsignacion(ENTRADA, "ops")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("cualquier otro error de la base sube tal cual: no se disfraza de 400", async () => {
    const service = new CustodiaAdminService(
      dbQue({ code: "57P01", message: "terminating connection" }),
      providers
    );
    const error = await service.registrarConsignacion(ENTRADA, "ops").catch((e: unknown) => e);
    // Sube el error original de Drizzle, con la causa de Postgres intacta.
    expect(error).not.toBeInstanceOf(BadRequestException);
    expect((error as { cause?: Error }).cause?.message ?? "").toMatch(/terminating connection/);
  });

  it("un proveedor desconocido no llega a la base", async () => {
    let tocada = false;
    const db = {
      execute: async () => {
        tocada = true;
        return [];
      }
    } as unknown as Db;
    const service = new CustodiaAdminService(db, providers);

    await expect(service.cobrosPorConsignar("combo-pay")).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.registrarConsignacion({ ...ENTRADA, provider: "combo-pay" }, "ops")
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tocada).toBe(false);
  });
});

describe("CustodiaAdminService — lecturas", () => {
  it("el cuadre distingue «no hay saldo registrado» (null) de «cuadra» (0)", async () => {
    const sinSaldo = new CustodiaAdminService(
      dbQue([{ fecha: "2026-09-11", saldo_libro: "68400", saldo_banco: null, diferencia: null }]),
      providers
    );
    expect(await sinSaldo.cuadreCustodia("2026-09-11")).toMatchObject({
      saldoLibro: 68_400,
      saldoBanco: null,
      diferencia: null
    });

    const cuadrado = new CustodiaAdminService(
      dbQue([
        {
          fecha: "2026-09-11",
          saldo_libro: "68400",
          saldo_banco: "68400",
          diferencia: "0",
          registrado_por: "ops",
          registrado_en: "2026-09-11T20:00:00Z"
        }
      ]),
      providers
    );
    expect(await cuadrado.cuadreCustodia("2026-09-11")).toMatchObject({
      saldoBanco: 68_400,
      diferencia: 0,
      registradoPor: "ops"
    });
  });

  it("el balance convierte los bigint (texto) a números, con ceros si no hay líneas", async () => {
    const service = new CustodiaAdminService(
      dbQue([
        {
          por_pagar: "4857200",
          comision: "120000",
          iva_por_pagar: "22800",
          costo_proveedor: "80000",
          margen: "40000",
          en_transito: "4920000",
          en_recaudo: "0",
          por_pagar_proveedor: "0"
        }
      ]),
      providers
    );
    expect(await service.balanceComercio("11111111-1111-4111-8111-111111111111")).toEqual({
      porPagar: 4_857_200,
      comision: 120_000,
      ivaPorPagar: 22_800,
      costoProveedor: 80_000,
      margen: 40_000,
      enTransito: 4_920_000,
      enRecaudo: 0,
      porPagarProveedor: 0
    });
    expect(await new CustodiaAdminService(dbQue([]), providers).balanceComercio("x")).toMatchObject(
      {
        porPagar: 0,
        margen: 0
      }
    );
  });
});
