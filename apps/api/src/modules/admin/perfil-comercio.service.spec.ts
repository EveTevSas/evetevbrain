import { describe, expect, it } from "vitest";
import { ConflictException } from "@nestjs/common";
import { PerfilComercioService } from "./perfil-comercio.service";
import { InMemoryPerfilesRepository } from "./in-memory-perfiles.repository";
import type { PerfilComercio } from "./perfil-comercio.schema";

/**
 * Primeros tests de PerfilComercioService: hasta ahora solo se probaba su
 * esquema Zod, y toda la traducción a columnas, el sello de verificación y lo
 * que se guarda en el rastro quedaban sin cubrir.
 */

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";

function perfil(cambios: Partial<PerfilComercio> = {}): PerfilComercio {
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
    beneficiarios: [
      {
        nombre: "Ana Gómez",
        tipoDocumento: "CC",
        numeroDocumento: "1020304050",
        participacion: 100,
        esPep: false
      }
    ],
    ...cambios
  };
}

function montar() {
  const repo = new InMemoryPerfilesRepository();
  return { repo, service: new PerfilComercioService(repo) };
}

describe("PerfilComercioService — traducción a columnas", () => {
  it("pasa camelCase a snake_case y los vacíos a null", async () => {
    const { repo, service } = montar();

    await service.guardar(TENANT, perfil({ telefono: "", nombreComercial: "  " }), "ops");

    const c = repo.perfiles.get(TENANT)!;
    expect(c.tipo_documento).toBe("NIT");
    expect(c.correo_notificaciones).toBe("sistemas@comercio.co");
    // Vacío no es lo mismo que "cadena vacía guardada": va como null.
    expect(c.telefono).toBeNull();
    expect(c.nombre_comercial).toBeNull();
  });

  it("los beneficiarios se reemplazan en bloque, no se acumulan", async () => {
    const { repo, service } = montar();

    await service.guardar(TENANT, perfil(), "ops");
    await service.guardar(
      TENANT,
      perfil({
        beneficiarios: [
          {
            nombre: "Jorge Ruiz",
            tipoDocumento: "CC",
            numeroDocumento: "9988776655",
            esPep: true
          }
        ]
      }),
      "ops"
    );

    const b = repo.beneficiarios.get(TENANT)!;
    expect(b).toHaveLength(1);
    expect(b[0]?.nombre).toBe("Jorge Ruiz");
  });
});

describe("PerfilComercioService — sello de verificación", () => {
  /* Quién dijo haber visto los documentos y cuándo lo pone el sistema con quien
     está operando. Si lo escribiera el formulario, cualquiera podría declarar
     que otro los verificó. */
  it("sin ningún documento verificado no se sella nada", async () => {
    const { repo, service } = montar();

    await service.guardar(TENANT, perfil(), "ops@evetev.com");

    const c = repo.perfiles.get(TENANT)!;
    expect(c.verificado_por).toBeNull();
    expect(c.verificado_en).toBeNull();
  });

  it("con al menos uno verificado se sella con quien está operando", async () => {
    const { repo, service } = montar();

    await service.guardar(TENANT, perfil({ rutVerificado: true }), "ops@evetev.com");

    const c = repo.perfiles.get(TENANT)!;
    expect(c.verificado_por).toBe("ops@evetev.com");
    expect(typeof c.verificado_en).toBe("string");
  });
});

describe("PerfilComercioService — el rastro no duplica datos personales", () => {
  /* La auditoría no se puede borrar nunca. Copiar ahí el perfil entero sería
     guardar cédulas, correos y cuentas bancarias para siempre, en una tabla
     pensada para responder "quién hizo qué", no para almacenar al comercio. */
  it("guarda el documento y conteos, no el contenido del perfil", async () => {
    const { repo, service } = montar();
    const p = perfil({ repNombre: "Ana Gómez", contactoCorreo: "luis@comercio.co" });

    await service.guardar(TENANT, p, "ops@evetev.com");

    const rastro = repo.rastros[0]!;
    expect(rastro.accion).toBe("comercio.perfil.guardar");
    expect(rastro.detalle).toEqual({
      documento: "NIT 830053105",
      tipoPersona: "juridica",
      beneficiarios: 1,
      conCuentaDispersion: false
    });

    const serializado = JSON.stringify(repo.rastros);
    expect(serializado).not.toContain("Ana Gómez");
    expect(serializado).not.toContain("luis@comercio.co");
    expect(serializado).not.toContain("1020304050");
  });

  it("señala si el comercio ya tiene cuenta para dispersión", async () => {
    const { repo, service } = montar();

    await service.guardar(
      TENANT,
      perfil({
        banco: "Bancolombia",
        tipoCuenta: "ahorros",
        numeroCuenta: "12345678901"
      }),
      "ops"
    );

    expect(repo.rastros[0]?.detalle?.conCuentaDispersion).toBe(true);
  });
});

describe("PerfilComercioService — documento repetido", () => {
  it("dice qué documento está repetido, no un error de base de datos", async () => {
    const { service } = montar();
    await service.guardar(TENANT, perfil(), "ops");

    await expect(service.guardar(OTRO, perfil(), "ops")).rejects.toBeInstanceOf(ConflictException);
    await expect(service.guardar(OTRO, perfil(), "ops")).rejects.toThrow(/NIT 830053105/);
  });

  it("guardar el MISMO comercio otra vez no es un duplicado", async () => {
    const { service } = montar();
    await service.guardar(TENANT, perfil(), "ops");

    await expect(
      service.guardar(TENANT, perfil({ telefono: "6019998877" }), "ops")
    ).resolves.toBeUndefined();
  });

  it("documentoYaUsado no se señala a sí mismo al editar", async () => {
    const { service } = montar();
    await service.guardar(TENANT, perfil(), "ops");

    expect(await service.documentoYaUsado("NIT", "830053105")).toBe(TENANT);
    // Editando ese mismo comercio, su propio documento no es un conflicto.
    expect(await service.documentoYaUsado("NIT", "830053105", TENANT)).toBeNull();
  });

  it("acepta el documento con espacios alrededor, como se pega del RUT", async () => {
    const { service } = montar();
    await service.guardar(TENANT, perfil(), "ops");

    expect(await service.documentoYaUsado("NIT", "  830053105  ")).toBe(TENANT);
  });
});

describe("PerfilComercioService — lecturas", () => {
  it("un comercio sin perfil devuelve null, no un perfil vacío", async () => {
    const { service } = montar();
    expect(await service.obtener(TENANT)).toBeNull();
  });

  it("el resumen arma el documento con su dígito de verificación", async () => {
    const { service } = montar();
    await service.guardar(TENANT, perfil(), "ops");

    const resumen = await service.resumenPorTenant();
    expect(resumen.get(TENANT)?.documento).toBe("NIT 830053105-3");
    expect(resumen.get(TENANT)?.tienePerfil).toBe(true);
  });
});
