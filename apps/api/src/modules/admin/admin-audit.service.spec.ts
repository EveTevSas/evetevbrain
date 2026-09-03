import { describe, expect, it, vi } from "vitest";
import type { Db } from "../../database/drizzle";
import { AdminAuditService } from "./admin-audit.service";

function dbQueDevuelve(filas: unknown[]) {
  return { execute: vi.fn(async () => filas) } as unknown as Db;
}

describe("AdminAuditService (CA-4, CA-5 de admin-console)", () => {
  it("registra y devuelve el id del rastro", async () => {
    const db = dbQueDevuelve([{ registrar_accion_admin: "audit-1" }]);
    const service = new AdminAuditService(db);

    const id = await service.registrar({
      actor: "ops@evetev.com",
      accion: "comercio.crear",
      objetoTipo: "tenant",
      objetoId: "t-1",
      detalle: { clavePrefijoLive: "evpk_live_abcd" }
    });

    expect(id).toBe("audit-1");
    expect(db.execute).toHaveBeenCalledOnce();
  });

  /* CA-5: sin rastro no hay acción. Si registrar tragara el error, quedaría un
     comercio creado —con sus claves— del que nadie podría decir quién lo hizo. */
  it("si la escritura falla, el error sube para que la acción se deshaga", async () => {
    const db = {
      execute: vi.fn(async () => {
        throw new Error("permiso denegado sobre audit.admin_actions");
      })
    } as unknown as Db;
    const service = new AdminAuditService(db);

    await expect(
      service.registrar({ actor: "ops@evetev.com", accion: "comercio.crear" })
    ).rejects.toThrow(/permiso denegado/);
  });

  it("si la función no devuelve id, tampoco se da por buena", async () => {
    const service = new AdminAuditService(dbQueDevuelve([]));

    await expect(
      service.registrar({ actor: "ops@evetev.com", accion: "comercio.crear" })
    ).rejects.toThrow(/no devolvió un registro/);
  });

  it("registrarEn usa la transacción que se le pasa, no una conexión suelta", async () => {
    const db = dbQueDevuelve([{ registrar_accion_admin: "de-la-db" }]);
    const tx = dbQueDevuelve([{ registrar_accion_admin: "de-la-tx" }]);
    const service = new AdminAuditService(db);

    const id = await service.registrarEn(tx, { actor: "ops", accion: "api_key.rotar" });

    expect(id).toBe("de-la-tx");
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("sin base configurada no inventa un registro", async () => {
    const service = new AdminAuditService(null);
    expect(await service.registrar({ actor: "ops", accion: "comercio.crear" })).toBeNull();
    expect(await service.listar()).toEqual([]);
  });
});
