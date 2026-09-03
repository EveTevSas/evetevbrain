import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { AdminService, type CrearComercioInput } from "./admin.service";
import { InMemoryComerciosRepository } from "./in-memory-comercios.repository";
import type { MerchantsService } from "../merchants/merchants.service";
import type { PerfilComercioService } from "./perfil-comercio.service";
import type { PerfilComercio } from "./perfil-comercio.schema";

/**
 * Primeros tests de AdminService. Antes no tenía ninguno: hablaba SQL directo y
 * lo único que se podía hacer era simular `db.execute`, con lo que los tests
 * acababan afirmando sobre el orden de las llamadas en vez de sobre lo que pasa.
 */

const MERCHANT_ID = "33333333-3333-4333-8333-333333333333";

function perfilValido(): PerfilComercio {
  return {
    tipoPersona: "juridica",
    nombreComercial: "",
    tipoDocumento: "NIT",
    numeroDocumento: "830053105",
    digitoVerificacion: "3",
    ciiu: "",
    responsableIva: false,
    direccion: "Calle 72 # 10-34",
    ciudad: "Bogotá",
    departamento: "Bogotá D.C.",
    telefono: "",
    sitioWeb: "",
    correoNotificaciones: "sistemas@comercio.co",
    correoFacturacion: "conta@comercio.co",
    direccionFacturacion: "",
    repNombre: "Ana Gómez",
    repTipoDocumento: "CC",
    repNumeroDocumento: "1020304050",
    repCorreo: "",
    repTelefono: "",
    repEsPep: false,
    contactoNombre: "Luis Pérez",
    contactoCargo: "",
    contactoCorreo: "luis@comercio.co",
    contactoTelefono: "",
    banco: "",
    tipoCuenta: undefined,
    numeroCuenta: "",
    titularCuenta: "",
    titularDocumento: "",
    rutVerificado: false,
    camaraComercioVerificada: false,
    cedulaRepVerificada: false,
    certificacionBancariaVerificada: false,
    beneficiarios: []
  };
}

const ENTRADA: CrearComercioInput = {
  legalName: "Comercio Demo SAS",
  displayName: "Demo",
  perfil: perfilValido()
};

interface Montaje {
  service: AdminService;
  repo: InMemoryComerciosRepository;
  perfilesGuardados: { tenantId: string; actor: string }[];
  registrar: ReturnType<typeof vi.fn>;
}

function montar(
  opciones: { documentoRepetido?: string; pasoManual?: string | null } = {}
): Montaje {
  const repo = new InMemoryComerciosRepository();
  const perfilesGuardados: { tenantId: string; actor: string }[] = [];

  const perfiles = {
    documentoYaUsado: async () => opciones.documentoRepetido ?? null,
    guardar: async (tenantId: string, _p: PerfilComercio, actor: string) => {
      perfilesGuardados.push({ tenantId, actor });
    },
    resumenPorTenant: async () => new Map()
  } as unknown as PerfilComercioService;

  const registrar = vi.fn(async (tenantId: string) => {
    repo.merchants.set(MERCHANT_ID, { tenantId, estado: "en_revision" });
    return {
      merchant: {
        id: MERCHANT_ID,
        legalName: "Comercio Demo SAS",
        estado: "en_revision" as const,
        creadoEn: "2026-09-03T00:00:00.000Z"
      },
      pasoManualProveedor: opciones.pasoManual ?? null
    };
  });

  const merchants = {
    registrar,
    obtenerPorTenant: async (tenantId: string) => {
      const encontrado = [...repo.merchants.entries()].find(([, m]) => m.tenantId === tenantId);
      return encontrado
        ? {
            id: encontrado[0],
            legalName: "Comercio Demo SAS",
            estado: encontrado[1].estado,
            creadoEn: "2026-09-03T00:00:00.000Z"
          }
        : null;
    }
  } as unknown as MerchantsService;

  return {
    service: new AdminService(repo, merchants, perfiles),
    repo,
    perfilesGuardados,
    registrar
  };
}

describe("AdminService — alta de comercios", () => {
  let m: Montaje;

  beforeEach(() => {
    m = montar();
  });

  it("crea tenant, perfil, merchant y las dos claves", async () => {
    const r = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    expect(m.repo.tenants.size).toBe(1);
    expect(m.perfilesGuardados).toEqual([{ tenantId: r.tenantId, actor: "ops@evetev.com" }]);
    expect(m.repo.claves.map((c) => c.environment).sort()).toEqual(["live", "test"]);
    expect(r.apiKey).toMatch(/^evpk_live_/);
    expect(r.testApiKey).toMatch(/^evpk_test_/);
  });

  /* El documento repetido se comprueba ANTES de tocar nada. El índice único lo
     impediría igual, pero saltando a mitad y dejando un tenant sin perfil ni
     claves — basura que después hay que ir a limpiar a mano. */
  it("un documento ya usado se rechaza sin crear absolutamente nada", async () => {
    m = montar({ documentoRepetido: "otro-tenant" });

    await expect(m.service.crearComercio(ENTRADA, "ops@evetev.com")).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(m.repo.tenants.size).toBe(0);
    expect(m.repo.claves).toHaveLength(0);
    expect(m.perfilesGuardados).toHaveLength(0);
    expect(m.registrar).not.toHaveBeenCalled();
  });

  it("el rastro guarda los prefijos, nunca las claves completas", async () => {
    const r = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    const rastro = m.repo.rastros.find((x) => x.accion === "comercio.crear");
    expect(rastro?.actor).toBe("ops@evetev.com");
    expect(rastro?.detalle?.clavePrefijoLive).toBe(r.apiKey.slice(0, 16));

    const serializado = JSON.stringify(m.repo.rastros);
    expect(serializado).not.toContain(r.apiKey);
    expect(serializado).not.toContain(r.testApiKey);
  });

  it("con un proveedor agregador propaga el paso manual pendiente", async () => {
    m = montar({ pasoManual: "combopay no da de alta comercios por API…" });

    const r = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    expect(r.pasoManualProveedor).toContain("combopay");
    expect(m.repo.rastros[0]?.detalle?.pasoManualProveedor).toContain("combopay");
  });
});

describe("AdminService — rotación de claves (CA-9)", () => {
  it("revoca las anteriores del entorno y deja activa solo la nueva", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    const r = await m.service.rotarApiKey(creado.tenantId, "live", "ops@evetev.com");

    expect(r.desactivadas).toBe(1);
    const live = m.repo.claves.filter((c) => c.environment === "live");
    expect(live.filter((c) => c.activa)).toHaveLength(1);
    expect(live.find((c) => c.activa)?.prefix).toBe(r.prefix);
    // La clave de pruebas no se toca: se rota una por una.
    expect(m.repo.claves.filter((c) => c.environment === "test" && c.activa)).toHaveLength(1);
  });

  it("el rastro dice qué prefijos quedaron revocados", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");
    const anterior = creado.apiKey.slice(0, 16);

    await m.service.rotarApiKey(creado.tenantId, "live", "ops@evetev.com");

    const rastro = m.repo.rastros.find((x) => x.accion === "api_key.rotar");
    expect(rastro?.detalle?.prefijosRevocados).toEqual([anterior]);
  });

  it("rotar un comercio inexistente no crea claves sueltas", async () => {
    const m = montar();

    await expect(
      m.service.rotarApiKey("99999999-9999-4999-8999-999999999999", "live", "ops@evetev.com")
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(m.repo.claves).toHaveLength(0);
  });
});

describe("AdminService — estados del comercio", () => {
  it("aprobar el KYC deja el merchant aprobado y lo audita con el estado anterior", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    const r = await m.service.cambiarEstadoKyc(creado.tenantId, "aprobado", "ops@evetev.com");

    expect(r.estado).toBe("aprobado");
    expect(m.repo.merchants.get(MERCHANT_ID)?.estado).toBe("aprobado");
    const rastro = m.repo.rastros.find((x) => x.accion === "comercio.kyc.aprobar");
    expect(rastro?.detalle).toMatchObject({ estadoAnterior: "en_revision", estado: "aprobado" });
  });

  it("rechazar el KYC es reversible: se puede volver a aprobar", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    await m.service.cambiarEstadoKyc(creado.tenantId, "aprobado", "ops@evetev.com");
    await m.service.cambiarEstadoKyc(creado.tenantId, "rechazado", "ops@evetev.com");
    const r = await m.service.cambiarEstadoKyc(creado.tenantId, "aprobado", "ops@evetev.com");

    expect(r.estado).toBe("aprobado");
    expect(m.repo.rastros.filter((x) => x.accion.startsWith("comercio.kyc"))).toHaveLength(3);
  });

  it("un comercio sin merchant no puede cambiar de KYC", async () => {
    const m = montar();
    const tenantId = await m.repo.crearTenant("Sin merchant", "Sin");

    await expect(
      m.service.cambiarEstadoKyc(tenantId, "aprobado", "ops@evetev.com")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("desactivar y reactivar el comercio queda auditado en ambos sentidos", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    expect((await m.service.cambiarEstadoComercio(creado.tenantId, false, "ops")).estado).toBe(
      "inactivo"
    );
    expect((await m.service.cambiarEstadoComercio(creado.tenantId, true, "ops")).estado).toBe(
      "activo"
    );

    expect(m.repo.rastros.map((x) => x.accion)).toContain("comercio.desactivar");
    expect(m.repo.rastros.map((x) => x.accion)).toContain("comercio.activar");
  });

  it("desactivar un comercio inexistente da 404", async () => {
    const m = montar();
    await expect(
      m.service.cambiarEstadoComercio("99999999-9999-4999-8999-999999999999", false, "ops")
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("AdminService — listado y ficha", () => {
  it("agrupa las filas por comercio: una clave no es un comercio", async () => {
    const m = montar();
    await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    const lista = await m.service.listarComercios();

    // Dos claves, un solo comercio con las dos.
    expect(lista).toHaveLength(1);
    expect(lista[0]?.apiKeys).toHaveLength(2);
  });

  it("la ficha devuelve el mismo objeto que el listado", async () => {
    const m = montar();
    const creado = await m.service.crearComercio(ENTRADA, "ops@evetev.com");

    const ficha = await m.service.obtenerComercio(creado.tenantId);
    const [deLaLista] = await m.service.listarComercios();

    expect(ficha).toEqual(deLaLista);
  });

  it("un comercio que no existe devuelve null, no una ficha vacía", async () => {
    const m = montar();
    expect(await m.service.obtenerComercio("99999999-9999-4999-8999-999999999999")).toBeNull();
  });
});
